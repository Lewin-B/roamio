import asyncio
from typing import Any, Dict
from quart import Blueprint, request, jsonify
from app.services.user_service import UserService
from app.db import NeonDB
from app.services.rating_service import RatingService

api_bp = Blueprint('api', __name__)
rating_service = RatingService()

@api_bp.route('/process-matches', methods=['POST'])
async def process_matches():  # Remove self and data parameters
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
        updated_ratings = await rating_service.process_matches(data)
        
        # Get updated place details
        pool = await NeonDB.get_pool()
        async with pool.acquire() as conn:
            places = await conn.fetch("""
                SELECT id, name, rating, elo_rating, ranking 
                FROM places 
                WHERE id = ANY($1::int[])
                """, 
                list(updated_ratings.keys())
            )
            
            updated_places = [{
                'id': place['id'],
                'name': place['name'],
                'rating': float(place['rating']),
                'elo_rating': float(place['elo_rating']),
                'ranking': place['ranking']
            } for place in places]

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