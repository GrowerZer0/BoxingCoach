import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicAudioDir = path.join(__dirname, '../public/audio');
const phrases = [
  "get ready", "rest", "halfway", "ten seconds", "round one", "round two", "round three",
  "jab", "cross", "hook"
];

const slugify = (text) => {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

const generateAudio = async () => {
  await mkdir(publicAudioDir, { recursive: true });
  console.log(`Ensured directory exists: ${publicAudioDir}`);

  for (const phrase of phrases) {
    const slug = slugify(phrase);
    const filename = `${slug}.mp3`;
    const filePath = path.join(publicAudioDir, filename);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(phrase)}&tl=en&client=tw-ob`;

    try {
      console.log(`Fetching audio for "${phrase}" from ${ttsUrl}`);
      const response = await fetch(ttsUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      await writeFile(filePath, Buffer.from(arrayBuffer));
      console.log(`Saved ${filename}`);
    } catch (error) {
      console.error(`Error generating audio for "${phrase}":`, error);
    }
  }
  console.log('Audio generation complete.');
};

generateAudio();
