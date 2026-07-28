import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractTickers, resolveConversationTickers } from './chatTickers.ts';

describe('chat ticker resolution', () => {
  it('recognizes a lowercase ticker introduced with conversational context', () => {
    assert.deepEqual(extractTickers('Look into secz. Tell me about it'), ['SECZ']);
  });

  it('does not turn ordinary prose into ticker candidates', () => {
    assert.deepEqual(
      extractTickers(
        'okay i just bought 3 shares for now cause thats all the money i had lmao. what do you think?',
      ),
      [],
    );
    assert.deepEqual(extractTickers('no ill just add it to my portfolio cause i bought'), []);
  });

  it('allows an ambiguous symbol when the user makes it explicit', () => {
    assert.deepEqual(extractTickers('tell me about ALL stock'), ['ALL']);
    assert.deepEqual(extractTickers('compare $ALL with RKLB'), ['ALL', 'RKLB']);
  });

  it('carries the newest explicit user ticker into a follow-up', () => {
    assert.deepEqual(
      resolveConversationTickers('so how many shares should i increase to', [
        "i'm talking about secz",
        'is this worth buying?',
        'look into all stock',
      ]),
      ['SECZ'],
    );
  });

  it('does not let "all the money" replace the active SECZ conversation', () => {
    assert.deepEqual(
      resolveConversationTickers(
        'okay i just bought 3 shares for now cause thats all the money i had lmao',
        [
          'is it worth buying, is it aggressive, and is it long term?',
          'Look into secz. Tell me about it',
        ],
      ),
      ['SECZ'],
    );
  });
});
