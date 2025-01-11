import asyncio
import json
from typing import Any, Dict
from quart import Blueprint, request, jsonify
from app.services.user_service import UserService
from app.db import NeonDB
from app.services.rating_service import RatingService

api_bp = Blueprint('api', __name__)
rating_service = RatingService()

@api_bp.route('/user', methods=['POST'])
async def create_user():
    try:
        data = await request.get_json()
        print("data: ", data)
        
        required_fields = ['name', 'email', 'clerkId']
        if not all(field in data for field in required_fields):
            return {'error': 'Missing required fields'}, 400

        user_id = await UserService.create_user(
            username=data['name'],
            email=data['email'],
            clerk_id=data['clerkId'],
            image_url=data.get('image_url', None)
        )
        
        return {'data': {'id': user_id}}, 201

    except Exception as e:
        print(f"Error creating user: {str(e)}")
        return {'error': 'Internal Server Error'}, 500

@api_bp.route('/random_user', methods=['GET'])
async def get_random_users():
    pool = await NeonDB.get_pool()
    async with pool.acquire() as conn:
        users = await conn.fetch("""
            SELECT *
            FROM users
            ORDER BY RANDOM()
            LIMIT 3
        """)
        
        return jsonify([{
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'clerkId': user['clerk_id'],
            'imageUrl': user['image_url']
            # Add any other fields from your users table
        } for user in users])

@api_bp.route('/process-matches', methods=['POST'])
async def process_matches():
    try:
        data = await request.get_json()
        print(data)
        matches = data.get('matches', [])
        
        if not matches:
            return {'error': 'No matches provided'}, 400

        # Validate required fields for review
        if data.get('place_id') and not data.get('user_id'):
            return {'error': 'user_id is required when submitting a review'}, 400
        
        if data.get('place_id') and not data.get('text_review'):
            data["text_review"] = ""
            # return {'error': 'text_review is required when submitting a review'}, 400

        # Process matches and create review
        updated_places = await rating_service.process_matches(data)
        
        return jsonify({
            'success': True,
            'updated_places': updated_places
        })

    except Exception as e:
        print(f"Error in process_matches: {str(e)}")  # For debugging
        return {'error': str(e)}, 500

@api_bp.route('/rankings', methods=['GET'])
async def get_rankings():
    pool = await NeonDB.get_pool()
    async with pool.acquire() as conn:
        places = await conn.fetch("""
            SELECT name, rating, ranking 
            FROM places 
            ORDER BY rating DESC
        """)
        
        return jsonify([{
            'name': place['name'],
            'rating': float(place['rating']),
            'ranking': place['ranking']
        } for place in places])

@api_bp.route('/users/<int:user_id>', methods=['GET'])
async def get_user(user_id):
    user = await UserService.get_user_by_id(user_id)
    if user:
        return jsonify(user)
    return {'error': 'User not found'}, 404

@api_bp.route('/users', methods=['GET'])
async def get_users():
    users = await UserService.get_all_users()
    return jsonify([user.__dict__ for user in users])

"""@api_bp.route('/users', methods=['POST'])
async def create_user():
    data = await request.get_json()
    user_id = await UserService.create_user(
        data['username'],
        data['email']
    )
    return {'id': user_id}, 201"""

@api_bp.route('/users/<int:user_id>/followees', methods=['GET'])
async def get_followees(user_id):
    """Get list of users that the specified user follows"""
    try:
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            followees = await conn.fetch("""
                SELECT u.* 
                FROM users u
                JOIN followers f ON u.id = f.followee
                WHERE f.follower = $1
                ORDER BY u.username
            """, user_id)
            
            return jsonify([{
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'clerk_id': user['clerk_id']
            } for user in followees])
    except Exception as e:
        print(f"Error getting followees: {str(e)}")
        return {'error': 'Failed to get followees'}, 500

@api_bp.route('/users/<int:user_id>/followers', methods=['GET'])
async def get_followers(user_id):
    """Get list of users who follow the specified user"""
    try:
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            followers = await conn.fetch("""
                SELECT u.* 
                FROM users u
                JOIN followers f ON u.id = f.follower
                WHERE f.followee = $1
                ORDER BY u.username
            """, user_id)
            
            return jsonify([{
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'clerk_id': user['clerk_id']
            } for user in followers])
    except Exception as e:
        print(f"Error getting followers: {str(e)}")
        return {'error': 'Failed to get followers'}, 500

@api_bp.route('/users/<int:follower_id>/follow/<int:followee_id>', methods=['POST'])
async def follow_user(follower_id, followee_id):
    """Follow a user"""
    try:
        # Validate users exist and aren't the same
        if follower_id == followee_id:
            return {'error': 'Cannot follow yourself'}, 400

        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            # Check if users exist
            users_exist = await conn.fetchrow("""
                SELECT COUNT(*) as count 
                FROM users 
                WHERE id IN ($1, $2)
            """, follower_id, followee_id)
            
            if users_exist['count'] < 2:
                return {'error': 'One or both users not found'}, 404

            # Check if already following
            existing = await conn.fetchval("""
                SELECT id FROM followers 
                WHERE follower = $1 AND followee = $2
            """, follower_id, followee_id)
            
            if existing:
                return {'error': 'Already following'}, 400

            # Create follow relationship
            await conn.execute("""
                INSERT INTO followers (follower, followee)
                VALUES ($1, $2)
            """, follower_id, followee_id)
            
            return {'success': True, 'message': 'Successfully followed user'}, 201
    except Exception as e:
        print(f"Error following user: {str(e)}")
        return {'error': 'Failed to follow user'}, 500

@api_bp.route('/users/<int:follower_id>/unfollow/<int:followee_id>', methods=['POST'])
async def unfollow_user(follower_id, followee_id):
    """Unfollow a user"""
    try:
        print(follower_id, followee_id)
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            result = await conn.execute("""
                DELETE FROM followers 
                WHERE follower = $1 AND followee = $2
            """, follower_id, followee_id)
            
            if result == 'DELETE 0':
                return {'error': 'Wasn\'t following this user'}, 404
                
            return {'success': True, 'message': 'Successfully unfollowed user'}
    except Exception as e:
        print(f"Error unfollowing user: {str(e)}")
        return {'error': 'Failed to unfollow user'}, 500

@api_bp.route('/users/search', methods=['GET'])
async def search_users():
    """Search users by username"""
    try:
        search_term = request.args.get('username', '')
        if not search_term:
            return {'error': 'No search term provided'}, 400

        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            # Using ILIKE for case-insensitive pattern matching
            users = await conn.fetch("""
                SELECT 
                    users.*,
                    COALESCE(
                        JSON_AGG(
                            DISTINCT JSONB_BUILD_OBJECT('id', followers.id, 'username', followers.username)
                        ) FILTER (WHERE followers.id IS NOT NULL), 
                        '[]'
                    ) AS followers,
                    COALESCE(
                        JSON_AGG(
                            DISTINCT JSONB_BUILD_OBJECT('id', following.id, 'username', following.username)
                        ) FILTER (WHERE following.id IS NOT NULL), 
                        '[]'
                    ) AS following
                FROM 
                    users
                LEFT JOIN users AS followers ON followers.id = (
                    SELECT follower 
                    FROM followers 
                    WHERE followers.followee = users.id
                )
                LEFT JOIN users AS following ON following.id = (
                    SELECT followee 
                    FROM followers
                    WHERE followers.follower = users.id
                )
                WHERE 
                    users.username ILIKE $1
                GROUP BY 
                    users.id
                ORDER BY 
                    users.username
                LIMIT 20;
            """, f'%{search_term}%')
            
            return jsonify([{
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'clerk_id': user['clerk_id'],
                'followers': user['followers'],
                'following': user['following']
            } for user in users])
    except Exception as e:
        print(f"Error searching users: {str(e)}")
        return {'error': 'Failed to search users'}, 500
    
# Profile Update Route
@api_bp.route('/profile/update', methods=['PUT'])
async def update_profile():
    try:
        data = await request.get_json()
        clerk_id = data.get('clerk_id')
        username = data.get('username')
        bio = data.get('bio')
        image_url = data.get('image_url')

        if not clerk_id:
            return {'error': 'Missing clerk_id'}, 400

        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            user = await conn.fetchrow("""
                UPDATE users 
                SET 
                    username = COALESCE($1, username),
                    bio = COALESCE($2, bio),
                    image_url = COALESCE($3, image_url)
                WHERE clerk_id = $4
                RETURNING *
            """, username, bio, image_url, clerk_id)

            return jsonify({'data': dict(user)})
    except Exception as e:
        print(f"Error updating user: {str(e)}")
        return {'error': 'Internal Server Error'}, 500

# Profile Get Route
@api_bp.route('/profile/<clerk_id>', methods=['GET'])
async def get_profile(clerk_id):
    try:
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            result = await conn.fetch("""
                WITH user_connections AS (
                    SELECT 
                        users.*,
                        COALESCE(json_agg(DISTINCT reviews) FILTER (WHERE reviews.id IS NOT NULL), '[]') AS reviews,
                        COALESCE(
                            json_agg(
                                DISTINCT jsonb_build_object(
                                    'id', follower_users.id,
                                    'username', follower_users.username,
                                    'email', follower_users.email,
                                    'image_url', follower_users.image_url,
                                    'reviews', (
                                        SELECT COALESCE(json_agg(r), '[]')
                                        FROM reviews r
                                        WHERE r.user_id = follower_users.id
                                    )
                                )
                            ) FILTER (WHERE follower_users.id IS NOT NULL), 
                            '[]'
                        ) AS followers,
                        COALESCE(
                            json_agg(
                                DISTINCT jsonb_build_object(
                                    'id', following_users.id,
                                    'username', following_users.username,
                                    'email', following_users.email,
                                    'image_url', following_users.image_url,
                                    'reviews', (
                                        SELECT COALESCE(json_agg(r), '[]')
                                        FROM reviews r
                                        WHERE r.user_id = following_users.id
                                    )
                                )
                            ) FILTER (WHERE following_users.id IS NOT NULL), 
                            '[]'
                        ) AS following
                    FROM users
                    LEFT JOIN reviews ON users.id = reviews.user_id
                    LEFT JOIN followers AS followers_rel ON users.id = followers_rel.followee
                    LEFT JOIN users AS follower_users ON followers_rel.follower = follower_users.id
                    LEFT JOIN followers AS following_rel ON users.id = following_rel.follower
                    LEFT JOIN users AS following_users ON following_rel.followee = following_users.id
                    WHERE users.clerk_id = $1
                    GROUP BY users.id
                )
                SELECT * FROM user_connections
            """, clerk_id)

            # Deserialize the JSON string fields into Python lists
            data = []
            for row in result:
                row_dict = dict(row)
                row_dict['reviews'] = json.loads(row_dict['reviews'])
                row_dict['followers'] = json.loads(row_dict['followers'])
                row_dict['following'] = json.loads(row_dict['following'])
                data.append(row_dict)
            
            return jsonify({'data': data})
    except Exception as e:
        print(f"Error getting profile: {str(e)}")
        return {'error': 'Internal Server Error'}, 500

# Place Create Route
@api_bp.route('/places/create', methods=['POST'])
async def create_place():
    try:
        data = await request.get_json()
        required_fields = ['place_id', 'location', 'image']
        
        if not all(data.get(field) for field in required_fields):
            return {'error': 'Missing required fields'}, 400

        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            place = await conn.fetchrow("""
                INSERT INTO places (
                    place_id,
                    avg_rating,
                    location,
                    image,
                    name,
                    website,
                    formatted_address,
                    types
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            """, 
            data.get('place_id'),
            data.get('rating', 0),
            data.get('location'),
            data.get('image'),
            data.get('name', ''),
            data.get('website', ''),
            data.get('formatted_address', ''),
            data.get('types', '')
            )

            return jsonify({'data': dict(place)}), 201
    except Exception as e:
        print(f"Error creating place: {str(e)}")
        return {'error': 'Internal Server Error'}, 500

@api_bp.route('/places/<place_id>', methods=['GET'])
async def get_place(place_id):
    try:
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            result = await conn.fetch("""
                SELECT 
                    places.*,
                    COALESCE(
                        json_agg(reviews) FILTER (WHERE reviews.id IS NOT NULL), 
                        '[]'
                    ) AS reviews
                FROM places
                LEFT JOIN reviews ON places.id = reviews.place_id
                WHERE places.place_id = $1
                GROUP BY places.id
            """, place_id)
            
            # Convert each row to a dictionary and ensure 'reviews' is parsed into an array
            data = []
            for row in result:
                row_dict = dict(row)
                # Parse 'reviews' field from string to list
                row_dict['reviews'] = json.loads(row_dict['reviews'])
                data.append(row_dict)
            
            return jsonify({'data': data})
    except Exception as e:
        print(f"Error getting place: {str(e)}")
        return {'error': 'Internal Server Error'}, 500