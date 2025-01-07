import asyncio
from typing import Any, Dict
from quart import Blueprint, request, jsonify
from app.services.user_service import UserService
from app.db import NeonDB
from app.services.rating_service import RatingService

api_bp = Blueprint('api', __name__)
rating_service = RatingService()

@api_bp.route('/process-matches', methods=['POST'])
async def process_matches():
    try:
        data = await request.get_json()
        matches = data.get('matches', [])
        
        if not matches:
            return {'error': 'No matches provided'}, 400

        # Validate required fields for review
        if data.get('place_id') and not data.get('user_id'):
            return {'error': 'user_id is required when submitting a review'}, 400
        
        if data.get('place_id') and not data.get('text_review'):
            return {'error': 'text_review is required when submitting a review'}, 400

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

@api_bp.route('/users', methods=['POST'])
async def create_user():
    data = await request.get_json()
    user_id = await UserService.create_user(
        data['username'],
        data['email']
    )
    return {'id': user_id}, 201

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
                SELECT * FROM users 
                WHERE username ILIKE $1
                ORDER BY username
                LIMIT 20
            """, f'%{search_term}%')
            
            return jsonify([{
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'clerk_id': user['clerk_id']
            } for user in users])
    except Exception as e:
        print(f"Error searching users: {str(e)}")
        return {'error': 'Failed to search users'}, 500