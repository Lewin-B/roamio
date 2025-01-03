import math

class DynamicEloSystem:
    def __init__(self, k_min=10, k_max=50, decay_rate=0.1, scale_factor=400):
        """
        Initialize the dynamic Elo system.
        
        Parameters:
        - k_min: Minimum value for K (default: 10).
        - k_max: Maximum value for K (default: 50).
        - decay_rate: Decay rate for K (default: 0.1).
        - scale_factor: The scaling factor for rating differences (default: 400).
        """
        self.k_min = k_min
        self.k_max = k_max
        self.decay_rate = decay_rate
        self.scale_factor = scale_factor

    def calculate_k(self, n_ranked):
        """
        Calculate the K value dynamically based on the number of items ranked.
        
        Parameters:
        - n_ranked: Number of items the user has ranked.
        
        Returns:
        - Dynamic K value.
        """
        return self.k_min + (self.k_max - self.k_min) * math.exp(-self.decay_rate * n_ranked)

    def expected_score(self, rating_a, rating_b):
        """
        Calculate the expected score for a candidate based on their ratings.
        
        Parameters:
        - rating_a: The rating of candidate A.
        - rating_b: The rating of candidate B.
        
        Returns:
        - Expected score for candidate A.
        """
        return 1 / (1 + 10 ** ((rating_b - rating_a) / self.scale_factor))

    def update_rating(self, rating, expected, actual, n_ranked):
        """
        Update the rating based on the result of a match.
        
        Parameters:
        - rating: The current rating of the candidate.
        - expected: The expected score for the candidate.
        - actual: The actual score (1 for win, 0.5 for draw/neutral, 0 for loss).
        - n_ranked: Number of items the user has ranked.
        
        Returns:
        - The updated rating.
        """
        k = self.calculate_k(n_ranked)
        return rating + k * (actual - expected)

    def compare(self, rating_a, rating_b, outcome, n_ranked):
        """
        Compare two candidates and update their ratings based on the outcome.
        
        Parameters:
        - rating_a: The rating of candidate A.
        - rating_b: The rating of candidate B.
        - outcome: The result for candidate A:
          - 1 for thumbs up (win for A).
          - 0.5 for neutral (draw).
          - 0 for thumbs down (loss for A).
        - n_ranked: Number of items the user has ranked.
        
        Returns:
        - Updated ratings for candidate A and B as a tuple.
        """
        expected_a = self.expected_score(rating_a, rating_b)
        expected_b = 1 - expected_a
        
        new_rating_a = self.update_rating(rating_a, expected_a, outcome, n_ranked)
        new_rating_b = self.update_rating(rating_b, expected_b, 1 - outcome, n_ranked)
        
        return new_rating_a, new_rating_b

    def normalize_rating(self, rating, min_rating, max_rating, scale=10):
        """
        Normalize a rating to a specified scale (default: 0-10).
        
        Parameters:
        - rating: The rating to normalize.
        - min_rating: The minimum rating in the system.
        - max_rating: The maximum rating in the system.
        - scale: The scale to normalize to (default is 0-10).
        
        Returns:
        - Normalized rating.
        """
        return scale * (rating - min_rating) / (max_rating - min_rating)

