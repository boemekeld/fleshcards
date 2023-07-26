const WORDS = require('./words.js');
const fs = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

const doDownload = async function() {
  for (let i = 0; i < WORDS.length; i++) {
    try {
      const path = './audio/' + WORDS[i] + '.mp3';
      if (!fs.existsSync(path)) {
        try {
          let url = 'https://basicenglishspeaking.com/wp-content/uploads/2020/03/3000-words/' + WORDS[i].toLowerCase() + '.mp3';
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`unexpected response ${response.statusText}`);
          }
          await pipelineAsync(response.body, fs.createWriteStream(path));
        } catch (error) {
          let url = 'https://basicenglishspeaking.com/wp-content/uploads/2020/03/3000-words/' + WORDS[i] + '.mp3';
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`unexpected response ${response.statusText}`);
          }
          await pipelineAsync(response.body, fs.createWriteStream(path));
        }
      }
    } catch (error) {
      console.log(WORDS[i]);
      console.error(error);
    }
  }
}

function soundex(s) {
  const a = s.toLowerCase().split('');
  const f = a.shift();
  const r = a.map((v, i, a) => {
      switch (v) {
          case 'b':
          case 'f':
          case 'p':
          case 'v':
              return '1';
          case 'c':
          case 'g':
          case 'j':
          case 'k':
          case 'q':
          case 's':
          case 'x':
          case 'z':
              return '2';
          case 'd':
          case 't':
              return '3';
          case 'l':
              return '4';
          case 'm':
          case 'n':
              return '5';
          case 'r':
              return '6';
          default:
              return '';
      }
  }).join('');

  return (f + r).slice(0, 4).padEnd(4, '0');
}

function findSimilarWords(words, target, x) {
  const soundexMap = {};
  const targetSoundex = soundex(target);

  words.forEach(word => {
      const soundexCode = soundex(word);
      if(!soundexMap[soundexCode]) {
          soundexMap[soundexCode] = [];
      }
      soundexMap[soundexCode].push(word);
  });

  let similarWords = soundexMap[targetSoundex] || [];

  if(similarWords.length < x) {
      for(let key in soundexMap) {
          if(key[0] === targetSoundex[0] && key !== targetSoundex) {
              similarWords = similarWords.concat(soundexMap[key]);
          }
          if(similarWords.length >= x) break;
      }
  }

  return similarWords.slice(0, x);
}

const filePath = './words-pt.txt';
async function getWordPT(lineNumber) {
  try {
    const data = await fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n');
    if (lineNumber <= lines.length) return lines[lineNumber - 1].replace('\r', '');
    throw 'Linha não existe no arquivo';
  } catch (error) {
    throw error;
  }
}

function getWordIndex(word) {
  for (let i = 0; i < WORDS.length; i++) {
    if (WORDS[i] == word) return i;
  }
  return -1;
}

async function getSimilarPT(similar_en) {
  const similar_pt = [];
  for (let i = 0; i < similar_en.length; i++) {
    similar_pt.push(await getWordPT(getWordIndex(similar_en[i]) + 1));
  }
  return similar_pt;
}

//doDownload();

/*
for (let i = 0; i < WORDS.length; i++) {
  const similar = findSimilarWords(WORDS, WORDS[i], 3);
  if (similar.length > 1) {
    console.log(similar);
  }
}
*/

/*
let wordsTXT = '';
for (let i = 0; i < WORDS.length; i++) {
  wordsTXT += WORDS[i] + '\n';
}
fs.writeFileSync('./words.txt', wordsTXT);
*/

/*
async function getPTWords() {
  for (let i = 0; i < WORDS.length; i++) {
    const wordPt = await getWordPT(i + 1);
    console.log(WORDS[i] + ' = ' + wordPt);
  }
}
getPTWords();
*/

const jsonDump = [];
async function dumpJson() {
  for (let i = 0; i < WORDS.length; i++) {
    const wordPt = await getWordPT(i + 1);
    const similar_en = findSimilarWords(WORDS, WORDS[i], 3);
    const similar_pt = await getSimilarPT(similar_en);
    jsonDump.push({
      word_en: WORDS[i],
      word_pt: wordPt,
      similars_en: similar_en,
      similar_pt: similar_pt
    });
  }
  fs.writeFileSync('./words-dump.js', 'const WORDS = ' + JSON.stringify(jsonDump) + ';');
}
dumpJson();
