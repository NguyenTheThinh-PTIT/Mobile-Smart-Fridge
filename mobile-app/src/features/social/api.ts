import { axiosClient } from '@/core/network/AxiosClient';
import { ExceptionHandler } from '@/core/error/ExceptionHandler';

/**
 * Social API - API endpoints for social features
 *
 * TODO: Implement all endpoints
 */
export interface Post {
  id: string;
  author: string;
  content: string;
  likes: number;
  comments: number;
  createdAt: string;
}

export const socialApi = {
  /**
   * Get feed
   */
  getFeed: async (page?: number): Promise<Post[]> => {
    try {
      return await axiosClient.get('/social/feed', {
        params: { page, limit: 20 },
      });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Create post
   */
  createPost: async (content: string): Promise<Post> => {
    try {
      return await axiosClient.post('/social/posts', { content });
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },

  /**
   * Like post
   */
  likePost: async (postId: string): Promise<void> => {
    try {
      await axiosClient.post(`/social/posts/${postId}/like`);
    } catch (error) {
      throw ExceptionHandler.handleError(error);
    }
  },
};
