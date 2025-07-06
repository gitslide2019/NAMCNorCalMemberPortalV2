// Comprehensive Learning Management System (LMS) Service

import { PrismaClient } from '@prisma/client'
import { auditService } from './auditService'
import { notificationService } from './notificationService'

const prisma = new PrismaClient()

interface CourseCreateRequest {
  title: string
  description: string
  instructor: string
  category: string
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
  duration: number
  price: number
  thumbnailUrl?: string
  instructorId: string
}

interface ModuleCreateRequest {
  courseId: string
  title: string
  description?: string
  order: number
  duration: number
}

interface LessonCreateRequest {
  moduleId: string
  title: string
  content: string
  type: 'TEXT' | 'VIDEO' | 'AUDIO' | 'INTERACTIVE' | 'DOWNLOAD'
  videoUrl?: string
  duration?: number
  order: number
}

interface AssessmentCreateRequest {
  lessonId?: string
  courseId?: string
  title: string
  type: 'QUIZ' | 'ASSIGNMENT' | 'PROJECT' | 'EXAM'
  questions: AssessmentQuestion[]
  passingScore: number
  timeLimit?: number
  attempts: number
}

interface AssessmentQuestion {
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay'
  question: string
  options?: string[]
  correctAnswer: string | string[]
  points: number
  explanation?: string
}

interface AssessmentSubmission {
  assessmentId: string
  userId: string
  answers: Record<string, any>
}

export class LMSService {
  // Course Management
  async createCourse(request: CourseCreateRequest): Promise<any> {
    const {
      title,
      description,
      instructor,
      category,
      difficulty,
      duration,
      price,
      thumbnailUrl,
      instructorId
    } = request

    try {
      const course = await prisma.course.create({
        data: {
          title,
          description,
          instructor,
          category,
          difficulty,
          duration,
          price,
          thumbnailUrl,
          isPublished: false
        }
      })

      await auditService.log({
        userId: instructorId,
        action: 'COURSE_CREATED',
        resource: 'courses',
        resourceId: course.id,
        newData: { title, category, difficulty, price }
      })

      return course

    } catch (error) {
      console.error('Course creation failed:', error)
      throw new Error('Failed to create course')
    }
  }

  async publishCourse(courseId: string, instructorId: string): Promise<void> {
    try {
      // Validate course has required content
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          modules: {
            include: {
              lessons: true
            }
          }
        }
      })

      if (!course) {
        throw new Error('Course not found')
      }

      if (course.modules.length === 0) {
        throw new Error('Course must have at least one module')
      }

      const hasLessons = course.modules.some(module => module.lessons.length > 0)
      if (!hasLessons) {
        throw new Error('Course must have at least one lesson')
      }

      await prisma.course.update({
        where: { id: courseId },
        data: { isPublished: true }
      })

      await auditService.log({
        userId: instructorId,
        action: 'COURSE_PUBLISHED',
        resource: 'courses',
        resourceId: courseId
      })

      // Notify interested users
      await this.notifyCourseLaunch(course)

    } catch (error) {
      console.error('Course publishing failed:', error)
      throw error
    }
  }

  async createModule(request: ModuleCreateRequest): Promise<any> {
    const { courseId, title, description, order, duration } = request

    try {
      const module = await prisma.courseModule.create({
        data: {
          courseId,
          title,
          description,
          order,
          duration,
          isPublished: false
        }
      })

      await auditService.log({
        action: 'MODULE_CREATED',
        resource: 'course_modules',
        resourceId: module.id,
        newData: { courseId, title, order }
      })

      return module

    } catch (error) {
      console.error('Module creation failed:', error)
      throw new Error('Failed to create module')
    }
  }

  async createLesson(request: LessonCreateRequest): Promise<any> {
    const { moduleId, title, content, type, videoUrl, duration, order } = request

    try {
      const lesson = await prisma.lesson.create({
        data: {
          moduleId,
          title,
          content,
          type,
          videoUrl,
          duration,
          order,
          isPublished: false
        }
      })

      await auditService.log({
        action: 'LESSON_CREATED',
        resource: 'lessons',
        resourceId: lesson.id,
        newData: { moduleId, title, type, order }
      })

      return lesson

    } catch (error) {
      console.error('Lesson creation failed:', error)
      throw new Error('Failed to create lesson')
    }
  }

  // Assessment Management
  async createAssessment(request: AssessmentCreateRequest): Promise<any> {
    const {
      lessonId,
      courseId,
      title,
      type,
      questions,
      passingScore,
      timeLimit,
      attempts
    } = request

    try {
      const assessment = await prisma.assessment.create({
        data: {
          lessonId,
          courseId,
          title,
          type,
          questions,
          passingScore,
          timeLimit,
          attempts
        }
      })

      await auditService.log({
        action: 'ASSESSMENT_CREATED',
        resource: 'assessments',
        resourceId: assessment.id,
        newData: { title, type, questionCount: questions.length }
      })

      return assessment

    } catch (error) {
      console.error('Assessment creation failed:', error)
      throw new Error('Failed to create assessment')
    }
  }

  async submitAssessment(submission: AssessmentSubmission): Promise<any> {
    const { assessmentId, userId, answers } = submission

    try {
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId }
      })

      if (!assessment) {
        throw new Error('Assessment not found')
      }

      // Check if user has remaining attempts
      const previousSubmissions = await prisma.assessmentSubmission.count({
        where: { assessmentId, userId }
      })

      if (previousSubmissions >= assessment.attempts) {
        throw new Error('Maximum attempts exceeded')
      }

      // Grade the assessment
      const gradingResult = this.gradeAssessment(assessment.questions as AssessmentQuestion[], answers)

      const submissionRecord = await prisma.assessmentSubmission.create({
        data: {
          userId,
          assessmentId,
          answers,
          score: gradingResult.score,
          passed: gradingResult.score >= assessment.passingScore
        }
      })

      await auditService.log({
        userId,
        action: 'ASSESSMENT_SUBMITTED',
        resource: 'assessment_submissions',
        resourceId: submissionRecord.id,
        newData: {
          assessmentId,
          score: gradingResult.score,
          passed: submissionRecord.passed
        }
      })

      // Update lesson progress if assessment passed
      if (submissionRecord.passed && assessment.lessonId) {
        await this.updateLessonProgress(userId, assessment.lessonId, true)
      }

      return {
        submissionId: submissionRecord.id,
        score: gradingResult.score,
        passed: submissionRecord.passed,
        feedback: gradingResult.feedback,
        correctAnswers: gradingResult.correctAnswers,
        totalQuestions: gradingResult.totalQuestions
      }

    } catch (error) {
      console.error('Assessment submission failed:', error)
      throw error
    }
  }

  // Enrollment and Progress Management
  async enrollInCourse(userId: string, courseId: string): Promise<any> {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      })

      if (!course) {
        throw new Error('Course not found')
      }

      if (!course.isPublished) {
        throw new Error('Course is not available for enrollment')
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.courseEnrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        }
      })

      if (existingEnrollment) {
        throw new Error('Already enrolled in this course')
      }

      // Create enrollment
      const enrollment = await prisma.courseEnrollment.create({
        data: {
          userId,
          courseId,
          status: 'ACTIVE'
        }
      })

      await auditService.log({
        userId,
        action: 'COURSE_ENROLLED',
        resource: 'course_enrollments',
        resourceId: enrollment.id,
        newData: { courseId }
      })

      await notificationService.send({
        userId,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Course Enrollment Confirmed',
        message: `You have successfully enrolled in "${course.title}". Start learning today!`,
        channel: 'EMAIL',
        data: {
          courseTitle: course.title,
          courseId
        }
      })

      return enrollment

    } catch (error) {
      console.error('Course enrollment failed:', error)
      throw error
    }
  }

  async updateLessonProgress(userId: string, lessonId: string, completed: boolean = false): Promise<void> {
    try {
      const existingProgress = await prisma.lessonProgress.findUnique({
        where: {
          userId_lessonId: {
            userId,
            lessonId
          }
        }
      })

      if (existingProgress) {
        await prisma.lessonProgress.update({
          where: {
            userId_lessonId: {
              userId,
              lessonId
            }
          },
          data: {
            completed,
            completedAt: completed ? new Date() : null,
            timeSpent: existingProgress.timeSpent + 1 // Simplified time tracking
          }
        })
      } else {
        await prisma.lessonProgress.create({
          data: {
            userId,
            lessonId,
            completed,
            completedAt: completed ? new Date() : null,
            timeSpent: 1
          }
        })
      }

      // Check if course is completed
      if (completed) {
        await this.checkCourseCompletion(userId, lessonId)
      }

    } catch (error) {
      console.error('Progress update failed:', error)
      throw error
    }
  }

  async getCourseProgress(userId: string, courseId: string): Promise<any> {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          modules: {
            include: {
              lessons: {
                include: {
                  progress: {
                    where: { userId }
                  }
                }
              }
            }
          },
          enrollments: {
            where: { userId }
          }
        }
      })

      if (!course) {
        throw new Error('Course not found')
      }

      const enrollment = course.enrollments[0]
      if (!enrollment) {
        throw new Error('Not enrolled in this course')
      }

      let totalLessons = 0
      let completedLessons = 0
      let totalTimeSpent = 0

      course.modules.forEach(module => {
        module.lessons.forEach(lesson => {
          totalLessons++
          const progress = lesson.progress[0]
          if (progress?.completed) {
            completedLessons++
          }
          if (progress?.timeSpent) {
            totalTimeSpent += progress.timeSpent
          }
        })
      })

      const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

      return {
        courseId,
        enrollmentDate: enrollment.enrolledAt,
        status: enrollment.status,
        progress: progressPercentage,
        completedLessons,
        totalLessons,
        timeSpent: totalTimeSpent,
        isCompleted: enrollment.completedAt !== null,
        completedAt: enrollment.completedAt
      }

    } catch (error) {
      console.error('Failed to get course progress:', error)
      throw error
    }
  }

  // Certificate Management
  async issueCertificate(userId: string, courseId: string): Promise<any> {
    try {
      const progress = await this.getCourseProgress(userId, courseId)
      
      if (!progress.isCompleted) {
        throw new Error('Course not completed')
      }

      // Check if certificate already issued
      const existingCertificate = await prisma.certificate.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        }
      })

      if (existingCertificate) {
        return existingCertificate
      }

      const course = await prisma.course.findUnique({
        where: { id: courseId }
      })

      // Generate verification code
      const verificationCode = this.generateVerificationCode()

      // In production, you'd generate an actual certificate PDF/image
      const certificateUrl = `${process.env.FRONTEND_URL}/certificates/${verificationCode}`

      const certificate = await prisma.certificate.create({
        data: {
          userId,
          courseId,
          certificateUrl,
          verificationCode
        }
      })

      await auditService.log({
        userId,
        action: 'CERTIFICATE_ISSUED',
        resource: 'certificates',
        resourceId: certificate.id,
        newData: { courseId, verificationCode }
      })

      await notificationService.onCourseCompleted(userId, course?.title || 'Course')

      return certificate

    } catch (error) {
      console.error('Certificate issuance failed:', error)
      throw error
    }
  }

  async verifyCertificate(verificationCode: string): Promise<any> {
    try {
      const certificate = await prisma.certificate.findUnique({
        where: { verificationCode },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          course: {
            select: {
              title: true,
              instructor: true,
              duration: true
            }
          }
        }
      })

      if (!certificate) {
        throw new Error('Certificate not found')
      }

      const isValid = !certificate.expiresAt || certificate.expiresAt > new Date()

      return {
        isValid,
        student: certificate.user,
        course: certificate.course,
        issuedAt: certificate.issuedAt,
        expiresAt: certificate.expiresAt
      }

    } catch (error) {
      console.error('Certificate verification failed:', error)
      throw error
    }
  }

  // Analytics and Reporting
  async getCourseAnalytics(courseId: string): Promise<any> {
    try {
      const [
        course,
        enrollmentCount,
        completionCount,
        averageProgress,
        assessmentStats
      ] = await Promise.all([
        prisma.course.findUnique({
          where: { id: courseId },
          include: {
            modules: {
              include: {
                lessons: true
              }
            }
          }
        }),

        prisma.courseEnrollment.count({
          where: { courseId }
        }),

        prisma.courseEnrollment.count({
          where: {
            courseId,
            completedAt: { not: null }
          }
        }),

        prisma.courseEnrollment.aggregate({
          where: { courseId },
          _avg: { progress: true }
        }),

        prisma.assessmentSubmission.groupBy({
          by: ['passed'],
          where: {
            assessment: {
              courseId
            }
          },
          _count: { passed: true }
        })
      ])

      const totalLessons = course?.modules.reduce((sum, module) => sum + module.lessons.length, 0) || 0
      const completionRate = enrollmentCount > 0 ? (completionCount / enrollmentCount) * 100 : 0

      return {
        course: {
          id: course?.id,
          title: course?.title,
          totalModules: course?.modules.length || 0,
          totalLessons
        },
        enrollments: enrollmentCount,
        completions: completionCount,
        completionRate,
        averageProgress: averageProgress._avg.progress || 0,
        assessmentStats: {
          passed: assessmentStats.find(stat => stat.passed)?._count.passed || 0,
          failed: assessmentStats.find(stat => !stat.passed)?._count.passed || 0
        }
      }

    } catch (error) {
      console.error('Failed to get course analytics:', error)
      throw error
    }
  }

  // Private helper methods
  private gradeAssessment(questions: AssessmentQuestion[], answers: Record<string, any>): any {
    let totalPoints = 0
    let earnedPoints = 0
    const feedback: any[] = []

    questions.forEach((question, index) => {
      totalPoints += question.points
      const userAnswer = answers[index.toString()]
      const isCorrect = this.isAnswerCorrect(question, userAnswer)

      if (isCorrect) {
        earnedPoints += question.points
      }

      feedback.push({
        questionIndex: index,
        question: question.question,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        points: isCorrect ? question.points : 0,
        explanation: question.explanation
      })
    })

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0

    return {
      score: Math.round(score * 100) / 100,
      feedback,
      correctAnswers: feedback.filter(f => f.isCorrect).length,
      totalQuestions: questions.length
    }
  }

  private isAnswerCorrect(question: AssessmentQuestion, userAnswer: any): boolean {
    switch (question.type) {
      case 'multiple_choice':
        return question.correctAnswer === userAnswer

      case 'true_false':
        return question.correctAnswer.toString().toLowerCase() === userAnswer?.toString().toLowerCase()

      case 'short_answer':
        return question.correctAnswer.toString().toLowerCase().trim() === 
               userAnswer?.toString().toLowerCase().trim()

      case 'essay':
        // Essay questions would require manual grading
        return false

      default:
        return false
    }
  }

  private async checkCourseCompletion(userId: string, lessonId: string): Promise<void> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              include: {
                modules: {
                  include: {
                    lessons: {
                      include: {
                        progress: {
                          where: { userId }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!lesson) return

    const course = lesson.module.course
    let allLessonsCompleted = true

    for (const module of course.modules) {
      for (const moduleLesson of module.lessons) {
        const progress = moduleLesson.progress[0]
        if (!progress?.completed) {
          allLessonsCompleted = false
          break
        }
      }
      if (!allLessonsCompleted) break
    }

    if (allLessonsCompleted) {
      // Mark course as completed
      await prisma.courseEnrollment.update({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id
          }
        },
        data: {
          completedAt: new Date(),
          progress: 100
        }
      })

      // Issue certificate
      await this.issueCertificate(userId, course.id)
    }
  }

  private async notifyCourseLaunch(course: any): Promise<void> {
    // Notify users interested in this category
    const interestedUsers = await prisma.user.findMany({
      where: {
        // You'd have user preferences for course categories
        isActive: true
      },
      select: { id: true },
      take: 100
    })

    for (const user of interestedUsers) {
      await notificationService.send({
        userId: user.id,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'New Course Available',
        message: `A new ${course.category} course "${course.title}" is now available!`,
        data: {
          courseId: course.id,
          courseTitle: course.title,
          category: course.category
        }
      })
    }
  }

  private generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }
}

export const lmsService = new LMSService()