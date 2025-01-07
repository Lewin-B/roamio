import math

class DynamicEloSystem:
    def __init__(self, k_min=10, k_max=50, decay_rate=0.1, scale_factor=400):
        self.k_min = k_min
        self.k_max = k_max
        self.decay_rate = decay_rate
        self.scale_factor = scale_factor
        self.baseline_rating = 1000  # Added baseline rating
    
    def calculate_k(self, n_ranked):
        return self.k_min + (self.k_max - self.k_min) * math.exp(-self.decay_rate * n_ranked)
    
    def expected_score(self, rating_a, rating_b):
        return 1 / (1 + 10 ** ((rating_b - rating_a) / self.scale_factor))
    
    def update_rating(self, rating, expected, actual, n_ranked):
        k = self.calculate_k(n_ranked)
        return rating + k * (actual - expected)

    def update_single_rating(self, current_rating: float, vote_type: str, n_ranked: int) -> float:
        """
        Update rating for a single place based on user vote
        
        Parameters:
        - current_rating: Current ELO rating of the place
        - vote_type: 'up', 'down', or 'neutral'
        - n_ranked: Number of rankings processed
        
        Returns:
        - Updated rating
        """
        if vote_type == 'up':
            outcome = 1.0
        elif vote_type == 'down':
            outcome = 0.0
        else:  # neutral
            outcome = 0.5
            
        expected = self.expected_score(current_rating, self.baseline_rating)
        return self.update_rating(current_rating, expected, outcome, n_ranked)
    
    def compare(self, rating_a, rating_b, outcome, n_ranked):
        expected_a = self.expected_score(rating_a, rating_b)
        expected_b = 1 - expected_a
        
        new_rating_a = self.update_rating(rating_a, expected_a, outcome, n_ranked)
        new_rating_b = self.update_rating(rating_b, expected_b, 1 - outcome, n_ranked)
        
        return new_rating_a, new_rating_b
    
    def normalize_rating(self, rating, min_rating=0, max_rating=2000, scale=10):
        # Ensure the rating is within bounds
        rating = max(min_rating, min(rating, max_rating))
        return scale * (rating - min_rating) / (max_rating - min_rating)