export interface SampleScript {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  content: string;
}

export const SAMPLE_SCRIPTS: SampleScript[] = [
  {
    id: 'cyberpunk-10',
    name: 'Cyberpunk Odyssey (10 Scenes - Full Batch)',
    description: 'A 10-scene cinematic trailer demonstrating the full 10-video batch capacity and 2-stream concurrency.',
    itemCount: 10,
    content: `# Scene 1: Neo-Shinjuku Skyline
[16:9, 10s, 1080p, audio]
Wide drone establishing shot flying between colossal glass skyscrapers with holographic koi fish swimming through neon rain, photorealistic 8k, blade runner aesthetics.

# Scene 2: Rain-slicked Alleyway
[16:9, 5s, 1080p]
Low angle tracking shot of a mysterious figure in a reflective high-collar cyber trench coat stepping across puddles reflecting neon pink and blue storefront signs.

# Scene 3: The Black Market Android
[16:9, 8s, 1080p]
Intimate close-up of a cybernetic mechanic using a micro-soldering laser on translucent fiber-optic cables inside a smiling android's chrome wrist, sparks flying softly.

# Scene 4: Flying Police Interceptor
[16:9, 5s, 720p, audio]
A sleek matte-black spinner police vehicle with flashing cobalt strobes banking sharply between high-rise skywalk bridges into a foggy industrial abyss.

# Scene 5: Underground Hacker Den
[16:9, 8s, 1080p]
Steamy basement room illuminated by dozens of glowing curved OLED monitors showing cascading amber terminal code, server racks humming with cooling vapor.

# Scene 6: Holographic Billboard Singer
[9:16, 10s, 1080p, audio]
A towering 50-story holographic pop star singing passionately in the center of a bustling pedestrian sky-plaza, floating digital confetti drifting downward.

# Scene 7: High-Speed Maglev Chase
[16:9, 5s, 1080p]
Dynamic camera attached to the side of a futuristic supersonic bullet train roaring across an elevated suspension track above a glittering midnight ocean.

# Scene 8: Rooftop Rain Duel
[16:9, 10s, 1080p]
Two martial artists holding glowing energy blades facing each other on a helipad atop a skyscraper while torrential rain and lightning illuminate the dark sky.

# Scene 9: AI Nexus Chamber
[21:9, 12s, 1080p, audio]
Vast crystalline dome housing a pulsating quantum core made of floating sapphire rings rotating around a blinding miniature star, volumetric god rays.

# Scene 10: Dawn of New Earth
[16:9, 15s, 1080p, audio]
Epic aerial pull-back from the top of the megacity as artificial clouds part, revealing a breathtaking golden sunrise casting warmth across solar towers.`,
  },
  {
    id: 'nature-5',
    name: 'Planet Earth Wonders (5 Scenes)',
    description: 'A serene nature showcase with realistic cinematic wildlife and landscape prompts.',
    itemCount: 5,
    content: `## Scene 1: Arctic Aurora Borealis
[16:9, 10s, 1080p]
Time-lapse of vibrant emerald and violet aurora borealis dancing across starry polar skies over jagged glaciers and mirror-still fjord waters.

## Scene 2: Golden Savannah Migration
[16:9, 8s, 720p, audio]
Sweeping aerial camera gliding alongside a herd of elephants and zebras crossing a shallow sparkling river at sunset, kicked-up dust glowing golden.

## Scene 3: Deep Ocean Bioluminescence
[16:9, 10s, 1080p]
Macro lens filming alien-like translucent jellyfish pulsing rhythmically in dark oceanic depths, emitting gentle pulses of cyan and indigo bioluminescent light.

## Scene 4: Costa Rican Rainforest Canopy
[16:9, 5s, 1080p]
Misty morning sunrise bursting through emerald jungle leaves, vibrant scarlet macaws taking flight from lush mossy branches with dew drops glistening.

## Scene 5: Volcanic Island Eruption
[16:9, 12s, 1080p, audio]
Dramatic telephoto shot of dark basaltic lava cascading steadily down black volcanic rock into turbulent crashing ocean waves with thick billowing steam.`,
  },
  {
    id: 'seedance-30s-img2vid',
    name: 'Seedance 2.5 Image to Video (30s Extended)',
    description: 'Demonstrates Seedance 2.5 with 30s video duration, reference image uploads, and image-to-video prompt flow.',
    itemCount: 4,
    content: `# Scene 1: Celestial Temple Guardian
[16:9, 30s, 1080p, audio, Seedance 2.5]
![guardian.png](https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80)
An ornate porcelain warrior statue slowly awakens with glowing golden glyphs as mystical cherry blossom petals swirl in the mountain wind, cinematic 30-second continuous motion with atmospheric sound.

# Scene 2: Cybernetic Street Racer
[16:9, 30s, 1080p, Seedance 2.5]
![racer.png](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80)
Camera begins focused on the neon-lit reflection of an electric supercar, then smoothly tracks as it launches into a futuristic high-speed midnight drift through rainy city streets.

# Scene 3: Deep Sea Ancient Ruins
[21:9, 15s, 1080p, audio, Seedance 2.5]
![abyss.png](https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80)
A deep-sea submersible illuminates a forgotten underwater amphitheater overgrown with phosphorescent coral and schools of silver fish.

# Scene 4: Golden Hour Alpine Flight
[16:9, 30s, 1080p, audio, Seedance 2.5]
![alpine.png](https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80)
Magnificent 30-second fluid aerial gliding from snowcapped mountain peaks down into a shimmering turquoise glacial lake bathed in warm sunset hues.`,
  },
  {
    id: 'test-retry',
    name: 'Auto-Retry Verification Suite (3 Scenes)',
    description: 'Includes a scene engineered to demonstrate the auto-retry mechanism in the simulator.',
    itemCount: 3,
    content: `1. Golden retriever joyfully catching a frisbee in slow motion in a sunny park with dandelion seeds floating.
2. A fast-moving racecar on a sunny track (fail: tests transient network error handling and automatic retry progression).
3. A delicious cup of artisanal pour-over coffee dripping steadily through a copper filter in a sunlit Scandinavian kitchen.`,
  },
];
