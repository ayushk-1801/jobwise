import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { getSession } from "@/server/users";

export interface JobsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  location?: string;
  isRemote?: boolean;
  industry?: string;
  jobType?: string;
  experienceLevel?: string;
  sortBy?: 'createdAt' | 'salary' | 'title';
  sortOrder?: 'asc' | 'desc';
  recruiterId?: string; // Add recruiterId to filter by recruiter
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || undefined;
    const location = searchParams.get('location') || undefined;
    const isRemote = searchParams.get('isRemote') === 'true' ? true : 
                    searchParams.get('isRemote') === 'false' ? false : 
                    undefined;
    const industry = searchParams.get('industry') || undefined;
    const jobType = searchParams.get('jobType') || undefined;
    const experienceLevel = searchParams.get('experienceLevel') || undefined;
    const sortBy = searchParams.get('sortBy') as JobsQueryParams['sortBy'] || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') as JobsQueryParams['sortOrder'] || 'desc';
    const recruiterId = searchParams.get('recruiterId') || undefined; // Get recruiterId from query params
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build where clause for filtering
    const where: any = {
      isActive: true,
    };
    
    // Add recruiterId filter if provided
    if (recruiterId) {
      where.recruiterId = recruiterId;
    }
    
    // Add optional filters
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }
    
    if (isRemote !== undefined) {
      where.isRemote = isRemote;
    }
    
    if (industry) {
      where.industry = { contains: industry, mode: 'insensitive' };
    }
    
    if (jobType) {
      where.jobType = { contains: jobType, mode: 'insensitive' };
    }
    
    if (experienceLevel) {
      where.experienceLevel = { contains: experienceLevel, mode: 'insensitive' };
    }
    
    // Fetch jobs with pagination and filtering
    const jobs = await prisma.job.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        recruiter: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        },
        _count: {
          select: { applications: true }
        }
      },
    });
    
    // Get total count for pagination
    const totalCount = await prisma.job.count({ where });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return new NextResponse(
      JSON.stringify({
        jobs,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch jobs' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized. You must be logged in to create a job.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request body
    const jobData = await request.json();
    
    // Validate required fields
    const requiredFields = ['title', 'company', 'location', 'description', 'requirements', 'jobType', 'experienceLevel', 'industry'];
    
    for (const field of requiredFields) {
      if (!jobData[field]) {
        return new NextResponse(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Create the job in the database - matching the actual schema fields
    const createdJob = await prisma.job.create({
      data: {
        title: jobData.title,
        company: jobData.company,
        location: jobData.location,
        description: jobData.description,
        requirements: jobData.requirements,
        salary: jobData.salary || null,
        jobType: jobData.jobType,
        experienceLevel: jobData.experienceLevel,
        industry: jobData.industry,
        isRemote: jobData.isRemote || false,
        // Use expiresAt for application deadline instead of applicationDeadline
        expiresAt: jobData.applicationDeadline ? new Date(jobData.applicationDeadline) : null,
        contactEmail: jobData.contactEmail,
        isActive: true,
        recruiterId: userId,
        // Add new fields from schema
        yearsOfExperience: parseInt(jobData.yearsOfExperience) || 0,
        numberOfRoles: parseInt(jobData.numberOfRoles) || 1,
        shortlistSize: parseInt(jobData.shortlistSize) || 5,
        applicationUrl: jobData.applicationUrl || null,
      },
    });
    
    return new NextResponse(
      JSON.stringify(createdJob),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating job:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to create job position' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}