// Crew priority mapping:
// 1: Director
// 2: Cinematographer / Director of Photography
// 3: Original Music Composer / Music
// 4: Producer
// 5: Screenplay / Writer / Story
// 6: Editor
// 7: Executive Producer
// 8: Production Design / Art Direction
// 9: Sound / Costume Design
const getCrewPriority = (job) => {
  switch (job) {
    case "Director":
      return 1;
    case "Director of Photography":
    case "Cinematographer":
      return 2;
    case "Original Music Composer":
    case "Music":
      return 3;
    case "Producer":
      return 4;
    case "Screenplay":
    case "Writer":
    case "Story":
      return 5;
    case "Editor":
      return 6;
    case "Executive Producer":
      return 7;
    case "Production Design":
    case "Art Direction":
      return 8;
    case "Costume Design":
    case "Sound Designer":
    case "Sound":
      return 9;
    default:
      return 99;
  }
};

module.exports = {
  getCrewPriority,
};
