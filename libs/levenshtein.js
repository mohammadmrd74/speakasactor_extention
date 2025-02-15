(function () {
    'use strict';
  
    function levenshteinDistance(s1, s2) {
      if (s1.length === 0) return s2.length;
      if (s2.length === 0) return s1.length;
  
      let matrix = Array(s1.length + 1)
        .fill(null)
        .map(() => Array(s2.length + 1).fill(null));
  
      for (let i = 0; i <= s1.length; i++) matrix[i][0] = i;
      for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;
  
      for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s2.length; j++) {
          const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1, // Deletion
            matrix[i][j - 1] + 1, // Insertion
            matrix[i - 1][j - 1] + cost // Substitution
          );
        }
      }
  
      return matrix[s1.length][s2.length];
    }
  
    // Expose the function globally
    if (typeof window !== "undefined") {
      window.Levenshtein = { get: levenshteinDistance };
    }
  })();
  