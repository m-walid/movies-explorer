const electron = require("electron");
const url = require("url");
const path = require("path");
const { readdirSync } = require("fs");
const { getMoviesDetails } = require("../imdb-scraper");
const { dialog, shell } = electron.remote;

const cardsContainer = document.querySelector(".cards-container");
const selectFolder = document.querySelector(".folder-btn");
const loader = document.querySelector(".loading");
const searchElm = document.querySelector(".search");
const sortElm = document.querySelector(".arrow-rating");
const genresElm = document.querySelector(".select-genre");
let moviesDetails = {
  searched: null,
  genre: null,
  list: null,
};

function addMovieCard(movie) {
  const card = document.createElement("div");
  card.classList.add("card");
  card.innerHTML = `
    <img
    class="poster"
    src="${movie.poster}"
    alt="${movie.title} image"
    srcset=""
  />
  <div class="details">
    <div class="card-header">
      <div>
        <div class="title">${movie.title}</div>
        <div class="indent card-meta">
          <div class="genres">${movie.genres.join(", ")}</div>
          <div class="time">${movie.time}</div>
        </div>
      </div>
      <div class="rating">
        <div class="rate">${movie.rating}</div>
        <div class="votes">${movie.votes}</div>
        <div class="link" link='${movie.link}'>IMDB</div>
      </div>
    </div>
    <div class="summary indent">${movie.summary}</div>
    <div class="btn open-btn" path="${movie.path}">Open</div>
  </div>
    `;
  cardsContainer.appendChild(card);
}

// Event Listeners

//open dialog to select movies folder
selectFolder.addEventListener("click", async () => {
  const dir = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  const dirPath = dir.filePaths[0];
  if (dirPath) {
    cardsContainer.innerHTML = "";
    selectFolder.innerText = dirPath;
    const titles = getDirectories(dirPath);
    loader.style.display = "block";
    let t1;
    try {
      t1 = setTimeout(
        () => (loader.querySelector(".loading-msg").style.display = "block"),
        6 * 1000
      );
      moviesDetails.list = await getMoviesDetails(titles);
      document.querySelector(".counter").innerText = moviesDetails.list.length;
      moviesDetails.searched = false;
      moviesDetails.genre = null;
      sortElm.innerText = "▼";
      moviesDetails.list
        .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
        .forEach((movie) => addMovieCard(movie));
    } catch (e) {
      showError(
        "An error has occured please check your internet and try again uwu"
      );
      console.log(e);
    } finally {
      clearTimeout(t1);
      loader.querySelector(".loading-msg").style.display = "none";
      loader.style.display = "none";
    }
  }
});

//open selected movie folder
cardsContainer.addEventListener("click", (e) => {
  //open selected movie folder
  if (e.target.classList.contains("open-btn")) {
    const path = e.target.getAttribute("path");
    shell.openPath(path);
  }
  //open movie imdb link in browser
  else if (e.target.classList.contains("link")) {
    const link = e.target.getAttribute("link");
    shell.openExternal(link);
  }
});

//search movies
searchElm.addEventListener("keyup", () => {
  let list = moviesDetails.list;
  if (list && moviesDetails.genre !== null) {
    list = moviesDetails.list.filter((movie) =>
      genreFilter(movie, moviesDetails.genre)
    );
  }
  if (list) {
    cardsContainer.innerHTML = "";
    if (!/^\s*$/.test(searchElm.value)) {
      moviesDetails.searched = true;
      list
        .filter((movie) => fuzzyMatch(searchElm.value, movie.title))
        .forEach((movie) => addMovieCard(movie));
    } else {
      sortElm.innerText = "▼";
      list
        .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
        .forEach((movie) => addMovieCard(movie));
      moviesDetails.searched = false;
    }
  }
});

// sort by rating
sortElm.addEventListener("click", () => {
  const list = moviesDetails.list;
  if (list) {
    cardsContainer.innerHTML = "";
    if (sortElm.innerText === "▲") {
      sortElm.innerText = "▼";
      list
        .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
        .forEach((movie) => addMovieCard(movie));
    } else {
      sortElm.innerText = "▲";
      list
        .sort((a, b) => parseFloat(a.rating) - parseFloat(b.rating))
        .forEach((movie) => addMovieCard(movie));
    }
  }
});

//filter by genre
genresElm.addEventListener("change", () => {
  const genre = genresElm.value;
  let list = moviesDetails.list;
  cardsContainer.innerHTML = "";
  if (list && moviesDetails.searched !== null) {
    list = moviesDetails.list.filter((movie) =>
      fuzzyMatch(searchElm.value, movie.title)
    );
  }
  if (list && genre != "0") {
    list
      .filter((movie) => genreFilter(movie, genre))
      .forEach((movie) => addMovieCard(movie));
    moviesDetails.genre = genre;
  } else {
    sortElm.innerText = "▼";
    list
      .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
      .forEach((movie) => addMovieCard(movie));
    moviesDetails.genre = null;
  }
});

function showError(msg) {
  cardsContainer.innerHTML = `<div class="error">${msg}</div>`;
}

// Helper Functions
function getDirectories(source) {
  const dirs = readdirSync(source, { withFileTypes: true })
    .map((dir) => {
      return {
        title: formatTitle(dir.name),
        path: `${source}\\${dir.name}`,
      };
    })
    .filter((dir) => dir.title !== null);
  return dirs;
}

function formatTitle(title) {
  const regex = /(.+[\.\s]\(?\d{4})[\.\)]/;
  try {
    return title.match(regex)[1].replace(/[\.(\()]/g, " ");
  } catch (e) {
    return null;
  }
}

function genreFilter(movie, genre) {
  return movie.genres.indexOf(genre) !== -1;
}

function fuzzyMatch(input, str) {
  str = str.replace(/\s/g, "").toLowerCase();
  input = input.replace(/\s/g, "").toLowerCase();
  let i = 0,
    j = 0;
  while (j < str.length && i < input.length) {
    if (input[i] === str[j]) {
      i++;
    }
    j++;
  }
  return i < input.length ? false : true;
}
