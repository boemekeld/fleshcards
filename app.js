class Flashcard {
  constructor(question, answer, index) {
    this.question = question;
    this.answer = answer;
    this.index = index;
    this.box = 1;
  }

  answeredCorrectly() {
    this.box = Math.min(5, this.box + 1);
  }

  answeredIncorrectly() {
    this.box = Math.max(1, this.box - 1);
  }
}

class LeitnerSystem {
  constructor() {
    this.flashcards = [];
    this.boxes = [[], [], [], [], []];
  }

  addFlashcard(question, answer, index) {
    const flashcard = new Flashcard(question, answer, index);
    this.flashcards.push(flashcard);
    this.boxes[0].push(flashcard);
  }

  reviewFlashcard(flashcardIndex, correct) {
    const flashcard = this.flashcards[flashcardIndex];
    const oldBox = flashcard.box - 1;
    if (correct) {
      flashcard.answeredCorrectly();
    } else {
      flashcard.answeredIncorrectly();
    }
    const newBox = flashcard.box - 1;

    this.boxes[oldBox] = this.boxes[oldBox].filter((f) => f !== flashcard);
    this.boxes[newBox].push(flashcard);

    setInfo();
    saveToLocalStorage(system);
  }

  getRandomFlashcard() {
    const totalFlashcards = this.boxes.reduce((total, box) => total + box.length, 0);
    let randomIndex = Math.floor(Math.random() * totalFlashcards) + 1;
    for (let i = 0; i < this.boxes.length; i++) {
      if (randomIndex <= this.boxes[i].length) {
        const boxIndex = Math.floor(Math.random() * this.boxes[i].length);
        return this.boxes[i][boxIndex];
      } else {
        randomIndex -= this.boxes[i].length;
      }
    }
    throw new Error('Could not select a flashcard');
  }

  exportState() {
    return this.flashcards;
  }

  importState(flashcardsData) {
    for (let i = 0; i < flashcardsData.length; i++) {
      const flashcard = new Flashcard(flashcardsData[i].question, flashcardsData[i].answer, flashcardsData[i].index);
      flashcard.box = flashcardsData[i].box;
      this.flashcards.push(flashcard);
    }
    this.boxes = [[], [], [], [], []];
    this.flashcards.forEach(flashcard => {
      this.boxes[flashcard.box - 1].push(flashcard);
    });
  }  
}

function shuffleArray(array) {
  let currentIndex = array.length, temporaryValue, randomIndex;
  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}

let nextFlashcard = null;
let nextAudio = null;
const newCard = function() {
  let flashcard = null;
  if (nextFlashcard != null) {
    flashcard = nextFlashcard;
  } else {
    flashcard = system.getRandomFlashcard();
  }
  if (flashcard) {
    let words = [];
    words.push({
      en: WORDS[flashcard.index].word_en,
      pt: WORDS[flashcard.index].word_pt
    });
    for (let i = 0; i < WORDS[flashcard.index].similars_en.length; i++) {
      if (WORDS[flashcard.index].similars_en[i] != WORDS[flashcard.index].word_en) {
        words.push({
          en: WORDS[flashcard.index].similars_en[i],
          pt: WORDS[flashcard.index].similar_pt[i]
        });
        if (words.length == 3) break;
      }
    }
    words = shuffleArray(words);

    for (let i = 0; i < 3; i++) {
      document.getElementById("card-" + (i + 1)).querySelector('.word-en').innerHTML = words[i].en;
      document.getElementById("card-" + (i + 1)).querySelector('.word-pt').innerHTML = words[i].pt;
    }

    window.currentWordIndex = flashcard.index;
    window.currentWord = WORDS[flashcard.index];
    window.currentShuffle = words;

    let audio = null;
    if (nextAudio != null) {
      audio = nextAudio;
    } else {
      audio = new Audio('./audio/' + window.currentWord.word_en + '.mp3');
    }
    audio.play();

    nextFlashcard = system.getRandomFlashcard();
    nextAudio = new Audio('./audio/' + WORDS[nextFlashcard.index].word_en + '.mp3');
  }
  
};

let system = null;

const clickReview = function(card) {
  const erroTimeout = 1500;
  const mostraCorreta = function(cb) {
    let correctCard = 0;
    for (let i = 0; i < 3; i++) {
      if (window.currentWord.word_en == window.currentShuffle[i].en) {
        correctCard = i + 1;
        break;
      }
    }
    document.getElementById('card-' + correctCard).style.backgroundColor = '#4CAF50';
    window.setTimeout(function() {
      document.getElementById('card-' + correctCard).style.backgroundColor = '#5265b3';
      if (cb) cb();
    }, erroTimeout);
  };
  if (card == 4) {
    system.reviewFlashcard(window.currentWordIndex, false);
    mostraCorreta(function() {
      newCard();
    });
  } else {
    const acertou = (window.currentWord.word_en == window.currentShuffle[card - 1].en);
    document.getElementById('card-' + card).style.backgroundColor = (acertou) ? '#4CAF50' : '#ff8585';
    window.setTimeout(function() {
      document.getElementById('card-' + card).style.backgroundColor = '#5265b3';
      system.reviewFlashcard(window.currentWordIndex, acertou);
      newCard();
    }, acertou ? 200 : erroTimeout);
    if (!acertou) mostraCorreta(null);
  }
};

function saveToLocalStorage(system) {
  const systemState = system.exportState();
  const systemStateString = JSON.stringify(systemState);
  localStorage.setItem('leitnerSystem', systemStateString);
}

function readFromLocalStorage() {
  const system = new LeitnerSystem();
  const systemStateString = localStorage.getItem('leitnerSystem');
  if (systemStateString) {
    system.importState(JSON.parse(systemStateString));
  } else {
    for (let i = 0; i < WORDS.length; i++) {
      system.addFlashcard(WORDS[i].word_en, WORDS[i].word_pt, i);
    }
  }
  return system;
}

const setInfo = function() {
  document.getElementById('info').innerHTML = 
    'BOX 1: ' + system.boxes[0].length + ', ' +
    'BOX 2: ' + system.boxes[1].length + ', ' +
    'BOX 3: ' + system.boxes[2].length + ', ' +
    'BOX 4: ' + system.boxes[3].length + ', ' +
    'BOX 5: ' + system.boxes[4].length
  ;
};

/*
const AUDIOS = [];
const preloadAudios = function() {
  for (let i = 0; i < WORDS.length; i++) {
    AUDIOS[WORDS[i]] = new Audio('./audio/' + WORDS[i].word_en + '.mp3');
  }
};
preloadAudios();
*/

window.addEventListener("load", function () {
  document.getElementById("bt-play").addEventListener("click", function () {
    let audio = new Audio('./audio/' + window.currentWord.word_en + '.mp3');
    audio.play();
    //AUDIOS[window.currentWord.word_en].play();
  });
  document.getElementById("card-1").addEventListener("click", function () {
    clickReview(1);
  });
  document.getElementById("card-2").addEventListener("click", function () {
    clickReview(2);
  });
  document.getElementById("card-3").addEventListener("click", function () {
    clickReview(3);
  });
  document.getElementById("card-4").addEventListener("click", function () {
    clickReview(4);
  });

  system = readFromLocalStorage();
  setInfo();

  newCard();
});