import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment, CommentType } from './entities/comment.entity';

export interface CreateCommentDto {
  projectId: string;
  userId: string;
  content: string;
  parentId?: string;
  type?: CommentType;
  taskId?: string;
  requirementId?: string;
}

export interface UpdateCommentDto {
  content: string;
}

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
  ) {}

  async createComment(createCommentDto: CreateCommentDto): Promise<Comment> {
    try {
      const comment = this.commentRepository.create({
        ...createCommentDto,
        type: createCommentDto.type || CommentType.GENERAL,
      });

      const savedComment = await this.commentRepository.save(comment);
      
      // Load relations for the response
      const commentWithRelations = await this.commentRepository.findOne({
        where: { id: savedComment.id },
        relations: ['user', 'parent', 'replies'],
      });

      this.logger.log(`Comment created: ${savedComment.id} by user ${createCommentDto.userId}`);
      return commentWithRelations;
    } catch (error) {
      this.logger.error(`Error creating comment: ${error.message}`);
      throw error;
    }
  }

  async updateComment(commentId: string, userId: string, content: string): Promise<Comment> {
    try {
      const comment = await this.commentRepository.findOne({
        where: { id: commentId },
        relations: ['user'],
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      if (comment.userId !== userId) {
        throw new ForbiddenException('You can only edit your own comments');
      }

      comment.content = content;
      comment.isEdited = true;
      comment.updatedAt = new Date();

      const updatedComment = await this.commentRepository.save(comment);
      
      // Load relations for the response
      const commentWithRelations = await this.commentRepository.findOne({
        where: { id: updatedComment.id },
        relations: ['user', 'parent', 'replies'],
      });

      this.logger.log(`Comment updated: ${commentId} by user ${userId}`);
      return commentWithRelations;
    } catch (error) {
      this.logger.error(`Error updating comment: ${error.message}`);
      throw error;
    }
  }

  async deleteComment(commentId: string, userId: string): Promise<Comment> {
    try {
      const comment = await this.commentRepository.findOne({
        where: { id: commentId },
        relations: ['user'],
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      if (comment.userId !== userId) {
        throw new ForbiddenException('You can only delete your own comments');
      }

      // Soft delete
      comment.isDeleted = true;
      comment.deletedAt = new Date();
      comment.updatedAt = new Date();

      const deletedComment = await this.commentRepository.save(comment);
      
      this.logger.log(`Comment deleted: ${commentId} by user ${userId}`);
      return deletedComment;
    } catch (error) {
      this.logger.error(`Error deleting comment: ${error.message}`);
      throw error;
    }
  }

  async getProjectComments(projectId: string, page: number = 1, limit: number = 50): Promise<{
    comments: Comment[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const [comments, total] = await this.commentRepository.findAndCount({
        where: { 
          projectId,
          isDeleted: false,
          parentId: null, // Only top-level comments
        },
        relations: ['user', 'replies.user'],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      return {
        comments,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Error getting project comments: ${error.message}`);
      throw error;
    }
  }

  async getTaskComments(taskId: string): Promise<Comment[]> {
    try {
      return await this.commentRepository.find({
        where: { 
          taskId,
          isDeleted: false,
        },
        relations: ['user', 'parent', 'replies.user'],
        order: { createdAt: 'ASC' },
      });
    } catch (error) {
      this.logger.error(`Error getting task comments: ${error.message}`);
      throw error;
    }
  }

  async getRequirementComments(requirementId: string): Promise<Comment[]> {
    try {
      return await this.commentRepository.find({
        where: { 
          requirementId,
          isDeleted: false,
        },
        relations: ['user', 'parent', 'replies.user'],
        order: { createdAt: 'ASC' },
      });
    } catch (error) {
      this.logger.error(`Error getting requirement comments: ${error.message}`);
      throw error;
    }
  }

  async getCommentReplies(commentId: string): Promise<Comment[]> {
    try {
      return await this.commentRepository.find({
        where: { 
          parentId: commentId,
          isDeleted: false,
        },
        relations: ['user'],
        order: { createdAt: 'ASC' },
      });
    } catch (error) {
      this.logger.error(`Error getting comment replies: ${error.message}`);
      throw error;
    }
  }

  async getCommentById(commentId: string): Promise<Comment> {
    try {
      const comment = await this.commentRepository.findOne({
        where: { id: commentId, isDeleted: false },
        relations: ['user', 'parent', 'replies.user'],
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      return comment;
    } catch (error) {
      this.logger.error(`Error getting comment by ID: ${error.message}`);
      throw error;
    }
  }

  async searchComments(projectId: string, query: string): Promise<Comment[]> {
    try {
      return await this.commentRepository
        .createQueryBuilder('comment')
        .leftJoinAndSelect('comment.user', 'user')
        .leftJoinAndSelect('comment.parent', 'parent')
        .leftJoinAndSelect('comment.replies', 'replies')
        .leftJoinAndSelect('replies.user', 'replyUser')
        .where('comment.projectId = :projectId', { projectId })
        .andWhere('comment.isDeleted = :isDeleted', { isDeleted: false })
        .andWhere('comment.content ILIKE :query', { query: `%${query}%` })
        .orderBy('comment.createdAt', 'DESC')
        .getMany();
    } catch (error) {
      this.logger.error(`Error searching comments: ${error.message}`);
      throw error;
    }
  }

  async getCommentStats(projectId: string): Promise<{
    totalComments: number;
    totalReplies: number;
    recentActivity: Date;
  }> {
    try {
      const [totalComments, totalReplies, recentComment] = await Promise.all([
        this.commentRepository.count({
          where: { 
            projectId,
            isDeleted: false,
            parentId: null,
          },
        }),
        this.commentRepository.count({
          where: { 
            projectId,
            isDeleted: false,
            parentId: null,
          },
        }),
        this.commentRepository.findOne({
          where: { 
            projectId,
            isDeleted: false,
          },
          order: { createdAt: 'DESC' },
        }),
      ]);

      return {
        totalComments,
        totalReplies,
        recentActivity: recentComment?.createdAt || new Date(),
      };
    } catch (error) {
      this.logger.error(`Error getting comment stats: ${error.message}`);
      throw error;
    }
  }
}
