const seedInitialReviews = (db) => {
  const seedCount = db.prepare("SELECT COUNT(*) as count FROM reviews").get().count;

  if (seedCount === 0) {
    console.log("Seeding initial personal cinema reviews into SQLite database...");
    const initialReviews = [
      {
        id: "rev-1",
        tmdb_id: 2164,
        title: "Swades",
        year: "2004",
        poster: "https://image.tmdb.org/t/p/w500/i9f3H2XbE0P9gLp0R4M8Hk7F6Q5.jpg",
        backdrop: "https://image.tmdb.org/t/p/original/m9P3H2XbE0P9gLp0R4M8Hk7F6Q5.jpg",
        director: "Ashutosh Gowariker",
        genres: JSON.stringify(["Drama"]),
        rating: 5.0,
        review: "A masterpiece in restrained patriotism. The caravan sequence with water sold at the train station remains one of the most poignant moments in Indian cinema.",
        watched_date: "Aug 15, 2026",
        is_favorite: 1,
        created_at: 1723680000000,
        updated_at: 1723680000000,
      },
      {
        id: "rev-2",
        tmdb_id: 61128,
        title: "Zindagi Na Milegi Dobara",
        year: "2011",
        poster: "https://image.tmdb.org/t/p/w500/y6p9p9a6S4z5A6z3L5R1T7y8U9V.jpg",
        backdrop: "https://image.tmdb.org/t/p/original/7vYp9p9a6S4z5A6z3L5R1T7y8U9V.jpg",
        director: "Zoya Akhtar",
        genres: JSON.stringify(["Drama", "Comedy", "Adventure"]),
        rating: 4.5,
        review: "The ultimate modern road film. Beyond the stunning Spanish landscapes and skydiving sequences, it's really an examination of baggage we carry and the fear of truly living.",
        watched_date: "Aug 28, 2026",
        is_favorite: 1,
        created_at: 1724803200000,
        updated_at: 1724803200000,
      },
      {
        id: "rev-3",
        tmdb_id: 157336,
        title: "Interstellar",
        year: "2014",
        poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
        backdrop: "https://image.tmdb.org/t/p/original/rAiYTsqJJR0nhkQw852apzgG0vV.jpg",
        director: "Christopher Nolan",
        genres: JSON.stringify(["Adventure", "Drama", "Science Fiction"]),
        rating: 5.0,
        review: "Nolan's triumph of combining theoretical physics with visceral emotional weight. Zimmer's organ score drives the docking sequence into pure cinematic adrenaline.",
        watched_date: "Sep 01, 2026",
        is_favorite: 1,
        created_at: 1725148800000,
        updated_at: 1725148800000,
      },
      {
        id: "rev-4",
        tmdb_id: 353081,
        title: "Mission: Impossible - Fallout",
        year: "2018",
        poster: "https://image.tmdb.org/t/p/w500/AkJQvtR09Nuvv7z8x1p75TSt2sm.jpg",
        backdrop: "https://image.tmdb.org/t/p/original/aw4Acl5EFwV79aoqR56S89sC62x.jpg",
        director: "Christopher McQuarrie",
        genres: JSON.stringify(["Action", "Adventure", "Thriller"]),
        rating: 4.5,
        review: "The gold standard of modern practical action. The bathroom brawl and halo jump set pieces are masterclasses in kinetic cinematography and sound design.",
        watched_date: "Sep 04, 2026",
        is_favorite: 0,
        created_at: 1725408000000,
        updated_at: 1725408000000,
      },
    ];

    const insertStmt = db.prepare(`
      INSERT INTO reviews (id, tmdb_id, title, year, poster, backdrop, director, genres, rating, review, watched_date, is_favorite, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const r of initialReviews) {
      insertStmt.run(
        r.id,
        r.tmdb_id,
        r.title,
        r.year,
        r.poster,
        r.backdrop,
        r.director,
        r.genres,
        r.rating,
        r.review,
        r.watched_date,
        r.is_favorite,
        r.created_at,
        r.updated_at
      );
    }
  }
};

module.exports = {
  seedInitialReviews,
};
