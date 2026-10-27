import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdownToPrompts, exportPromptsToMarkdown } from './markdownParser';

test('parseMarkdownToPrompts parses numbered prompt lists', () => {
  const content = `
1. A neon cyberpunk street market in Tokyo with glowing holographic signs.
2. An ancient temple in the misty mountains of Kyoto at sunrise.
3. A futuristic electric hypercar drifting through a rain-slicked tunnel.
  `;

  const results = parseMarkdownToPrompts(content);
  assert.equal(results.length, 3);
  assert.equal(results[0].index, 1);
  assert.match(results[0].prompt, /cyberpunk street market/);
  assert.equal(results[0].duration, '5s');
  assert.equal(results[0].aspectRatio, '16:9');
});

test('parseMarkdownToPrompts extracts markdown headers and inline parameter tags', () => {
  const content = `
# Scene 1: Arrival at Mars
[16:9, 10s, 1080p, audio]
A massive crimson spacecraft lands gracefully on red Martian dust with retro-thrusters firing.

# Scene 2: Colony Discovery
[9:16, 8s, 720p]
Inside a glass geodesic dome, lush hydroponic plants flourish under artificial sunlight.
  `;

  const results = parseMarkdownToPrompts(content);
  assert.equal(results.length, 2);
  assert.equal(results[0].title, 'Scene 1: Arrival at Mars');
  assert.equal(results[0].aspectRatio, '16:9');
  assert.equal(results[0].duration, '10s');
  assert.equal(results[0].resolution, '1080p');
  assert.equal(results[0].generateAudio, true);

  assert.equal(results[1].title, 'Scene 2: Colony Discovery');
  assert.equal(results[1].aspectRatio, '9:16');
  assert.equal(results[1].duration, '8s');
  assert.equal(results[1].resolution, '720p');
  assert.equal(results[1].generateAudio, false);
});

test('parseMarkdownToPrompts handles delimiter-separated blocks', () => {
  const content = `
Close-up of an espresso machine dripping golden crema into a ceramic cup.
---
Drone shot swooping over turquoise Mediterranean waves crashing on white cliffs. [21:9, 15s]
---
A cozy fireplace burning cedar logs in a snowy wooden cabin.
  `;

  const results = parseMarkdownToPrompts(content);
  assert.equal(results.length, 3);
  assert.equal(results[1].aspectRatio, '21:9');
  assert.equal(results[1].duration, '15s');
});

test('exportPromptsToMarkdown roundtrips prompts accurately', () => {
  const content = `
# Hero Shot
[16:9, 10s, 1080p]
Golden retriever jumping into a pile of autumn leaves in slow motion.
  `;
  const parsed = parseMarkdownToPrompts(content);
  assert.equal(parsed.length, 1);
  const exported = exportPromptsToMarkdown(parsed);
  assert.match(exported, /## Scene 1: Hero Shot/);
  assert.match(exported, /\[16:9, 10s, 1080p\]/);
  assert.match(exported, /Golden retriever/);
});
