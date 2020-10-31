const cheerio = require("cheerio");
const fetch = require("node-fetch");

const URL = "https://www.imdb.com/find?s=tt&ttype=ft&ref_=fn_ft&q=";


function fuzzyMatch(input, str) {
  input = input.replace(/\s/g, "").toLowerCase();
  str = str.replace(/\s/g, "").toLowerCase();
  //   console.log(input, str)
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

async function getMovieLink(movie) {
  movieEncoded = encodeURIComponent(movie); // special characters like &
  const req = await fetch(`${URL}${movieEncoded}`);
  const searchPage = await req.text();
  const $ = cheerio.load(searchPage);

  let movieURL;
  try {
    movieURL = $(".findList")
      .find(".result_text")
      .map((i, elm) => $(elm))
      .get()
      .find((elm) => fuzzyMatch(movie, elm.text()))
      .find("a")
      .attr("href");
  } catch (e) {
    movieURL = $(".findList").find(".result_text").find("a").attr("href");
    if (!movieURL) return false;
  }
  movieURL = `https://www.imdb.com${movieURL}`;
  return movieURL;
}

async function getMovieDetails(movie) {
  const movieURL = await getMovieLink(movie.title);
  if (movieURL) {
    const req = await fetch(movieURL);
    const moviePage = await req.text();
    const $ = cheerio.load(moviePage);
    const movieDetails = {
      title: $("h1").text().trim(),
      rating: $('span[itemprop="ratingValue"]').text(),
      votes: $('span[itemprop="ratingCount"]').text(),
      time: $("time").first().text().replace(/\s\s+/g, ""),
      genres: $("h4")
        .map((i, elm) => $(elm))
        .get()
        .find((elm) => elm.text().trim() === "Genres:")
        .parent()
        .find("a")
        .map((i, elm) => $(elm).text().trim())
        .get(),
      summary: $(".summary_text").text().trim(),
      poster: $(".poster img").first().attr("src"),
      link: movieURL,
      path: movie.path,
    };
    return movieDetails;
  } else {
    return null;
  }
}

// Process the array concurrency
async function getMoviesDetails(movies) {
  const promises = await movies.map(
    async (movie) => await getMovieDetails(movie)
  );
  const moviesDetails = (await Promise.all(promises)).filter(
    (elm) => elm !== null
  );
  return moviesDetails;
}

/*
///////////////////////////////// This is a worse approach because every movie has to wait for the previous movie to finish
async function getMoviesDetails(movies) {
  const moviesDetails = [];
  const len = movies.length;
  for (let i = 0; i < len; i++) {
    moviesDetails.push(await getMovieDetails(movies[i]))
    // console.log(await getMovieDetails(movies[i]));
  }
    return moviesDetails
}
*/



module.exports = { getMoviesDetails, fuzzyMatch };
