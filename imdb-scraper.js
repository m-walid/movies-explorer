const cheerio = require("cheerio");
const fetch = require("node-fetch");

const URL = "https://www.imdb.com/find?s=tt&ttype=ft&ref_=fn_ft&q=";

function titleMatch(input, str) {
  input = input.match(/(.+)(\d{4})/);
  let title = input[1],
    year = input[2];
  title = title.trim().toLowerCase();
  str.title = str.title.trim().toLowerCase().replace(/[:]/g, "");
  return title === str.title && year === str.year;
}

async function getMovieLink(movie) {
  input = movie.match(/(.+)(\d{4})/);
  let title = input[1];
  movieEncoded = encodeURIComponent(title); // special characters like &
  const req = await fetch(`${URL}${movieEncoded}`);
  const searchPage = await req.text();
  const $ = cheerio.load(searchPage);

  let movieURL;
  try {
    movieURL = $(".findList")
      .find(".result_text")
      .map((i, elm) => $(elm))
      .get()
      .find((elm) =>
        titleMatch(movie, {
          title: elm.find("a").text(),
          year: elm.text().match(/(\d{4})/)[1],
        })
      )
      .find("a")
      .attr("href");
  } catch (e) {
    console.log(e);
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
      rating: $('.AggregateRatingButton__RatingScore-sc-1ll29m0-1').first().text(),
      votes: $('.AggregateRatingButton__TotalRatingAmount-sc-1ll29m0-3.jkCVKJ').first().text(),
      time: $("time").first().text().replace(/\s\s+/g, ""),
      genres: $(".ipc-metadata-list-item__label").filter(function () {
        return $(this).text().trim() === 'Genres';
      }).parent().find("a").map((i, elm) => $(elm).text().trim()
      ).get(),
      summary: $(".summary_text").text().trim(),
      poster: $(".ipc-image").first().attr("src"),
      link: movieURL,
      path: movie.path,
    };
    return movieDetails;
  } else {
    return null;
  }
}

async function getMoviesDetails(movies, callback) {
  const queue = movies;
  const maxSimRequests = 5;
  let currentRequests = 0;
  let i = 0;
  const fetchInterval = setInterval(async () => {
    if (queue.filter((movie) => movie).length === 0) {
      // all requests are done
      clearInterval(fetchInterval);
    }
    if (currentRequests >= maxSimRequests || i > queue.length - 1) {
      //skip if the current requests are more than max or if the last request reached
      return;
    }
    const currentIndex = i++;
    const currentMovie = queue[currentIndex];
    currentRequests++;
    result = await getMovieDetails(currentMovie); //get current movie
    if (result) callback(result);
    currentRequests--;
    delete queue[currentIndex]; //set  current movie to undefined in the queue when finished
  }, 300);
}


module.exports = { getMoviesDetails, getMovieDetails };
