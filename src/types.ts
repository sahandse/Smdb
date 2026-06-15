export interface OMDBMovie {
  Title: string
  Year: string
  Rated: string
  Released: string
  Runtime: string
  Genre: string
  Director: string
  Writer: string
  Actors: string
  Plot: string
  Language: string
  Country: string
  Awards: string
  Poster: string
  Ratings: Array<{ Source: string; Value: string }>
  imdbRating: string
  imdbVotes: string
  imdbID: string
  Type: string
  BoxOffice: string
  Response: string
  Error?: string
}

export interface AppState {
  imdbCode: string
  videoCode: string
  apiKey: string
  movie: OMDBMovie | null
  persianPlot: string
}
