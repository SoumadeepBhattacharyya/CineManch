import axios from 'axios';
import axiosRetry from 'axios-retry';
import Movie from "../models/Movie.js";
import Show from '../models/Show.js';




const axiosInstance = axios.create({
  timeout: 5000, 
  headers: {
    Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
  },
});


axiosRetry(axiosInstance, {
  retries: 3,
  retryCondition: (error) =>
    axiosRetry.isNetworkError(error) || error.code === 'ECONNRESET',
  retryDelay: (retryCount) => retryCount * 1000,
});


export const getNowPlayingMovies = async (req, res) => {
  try {
    const { data } = await axiosInstance.get('https://api.themoviedb.org/3/movie/now_playing');
    res.json({ success: true, movies: data.results });
  } catch (error) {
    console.error("API Error:", error.code || error.name, error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch now playing movies' });
  }
};

export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    let movie = await Movie.findById(movieId);

    if (!movie) {
      
      const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
        axiosInstance.get(`https://api.themoviedb.org/3/movie/${movieId}`),
        axiosInstance.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`)
      ]);

      const movieApiData = movieDetailsResponse.data;
      const movieCreditsData = movieCreditsResponse.data; 

      const movieDetails = {
        _id: movieId,
        title: movieApiData.title,
        overview: movieApiData.overview,
        poster_path: movieApiData.poster_path,
        backdrop_path: movieApiData.backdrop_path,
        genres: movieApiData.genres,
        casts: movieCreditsData.cast,
        release_date: movieApiData.release_date,
        original_language:movieApiData.original_language,
        tagline: movieApiData.tagline || "",
        vote_average: movieApiData.vote_average,
        runtime: movieApiData.runtime,
        

      };

      movie = await Movie.create(movieDetails);
    }

    const showsToCreate = [];

    showsInput.forEach(show => {
      const showDate = show.date;
      show.time.forEach((time) => {
        const dateTimeString = `${showDate}T${time}`;
        showsToCreate.push({
          movie: movieId,
          showDateTime: new Date(dateTimeString),
          showPrice,
          occupiedSeats: {}
        });
      });
    });

    if (showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
    }

    res.json({ success: true, message: 'Show Added Successfully.' });
  } catch (error) {
    console.error("Add Show Error:", error.code || error.name, error.message);
    res.status(500).json({ success: false, message: error.message || 'Error adding show' });
  }
};




export const getShows = async(req,res)=>{
    try {
        const shows= await Show.find({showDateTime:{$gte:new Date()}}).populate('movie').sort({showDateTime: 1});
        

        console.log(shows);
        const uniqueShows = new Set(shows.map(show => show.movie))

        res.json({success:true,shows:Array.from(uniqueShows)})
    } catch (error) {
        console.error(error);
        res.json({success:false,message:error.message});
    }
}


export const getShow=async(req,res)=>{
    try {
        const{movieId}=req.params;
        

        const shows=await Show.find({movie:movieId, showDateTime: {$gte:new Date() }})

        const movie=await Movie.findById(movieId);

        const dateTime={};

        shows.forEach((show)=>{
            const date=show.showDateTime.toISOString().split("T")[0];

            if(!dateTime[date]){
                dateTime[date]=[]
            }

            dateTime[date].push({time:show.showDateTime,showId:show._id})
        })

        res.json({success:true,movie,dateTime})
    } catch (error) {

        console.log(error);
        res.json({success:false,message:error.message});
        
    }
}