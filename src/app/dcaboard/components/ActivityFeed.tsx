'use client';
import Image from 'next/image';
import { ZenSloth } from './ZenSloth';
import { ActivityItem } from '../types';
import { formatTimeAgo } from '../utils/formatTime';

interface ActivityFeedProps {
  activities: ActivityItem[];
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function ActivityFeed({
  activities,
  currentPage,
  itemsPerPage,
  onPageChange
}: ActivityFeedProps) {
  const totalPages = Math.ceil(activities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentActivities = activities.slice(startIndex, endIndex);

  return (
    <section className='relative mt-8 border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-6 shadow-sm'>
      <div className='flex flex-col md:flex-row gap-6 items-start'>
        {/* Activity feed - 1 column, half width on desktop */}
        <div className='w-full md:w-1/2 min-w-0'>
          <h2 className='mb-4 text-sm font-semibold tracking-tight'>
            Latest DCAi Activity
          </h2>
          <div className='flex flex-col gap-3'>
            {activities.length === 0 ? (
              <p className='text-sm text-[hsl(var(--gray-300)/0.7)]'>
                No activity yet. Your DCAi transactions will appear here.
              </p>
            ) : (
              <>
                {/* Activity items */}
                <div className='flex flex-col gap-3'>
                  {currentActivities.map((activity, index) => {
                    const isLast = index === currentActivities.length - 1;

                    return (
                      <div
                        key={`${activity.type}-${activity.timestamp}-${startIndex + index}`}
                        className={`flex items-center gap-3 ${!isLast ? 'border-b border-[hsl(var(--gray-300)/0.1)] pb-3' : ''} text-sm`}
                      >
                        <div className='flex h-8 w-8 items-center justify-center border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] text-[hsl(var(--gray-300)/0.9)]'>
                          <span className='text-xs'>{activity.icon}</span>
                        </div>
                        <div className='flex-1'>
                          <p className='font-medium'>{activity.title}</p>
                          <p className='text-xs text-[hsl(var(--gray-300)/0.7)]'>
                            {activity.description} • {formatTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination controls */}
                {totalPages > 1 && (
                  <div className='flex items-center justify-between pt-3 border-t border-[hsl(var(--gray-300)/0.1)]'>
                    <button
                      type='button'
                      onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className='inline-flex items-center justify-center border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[hsl(var(--gray-300)/0.2)] disabled:hover:bg-[hsl(var(--background))]'
                    >
                      Previous
                    </button>
                    <span className='text-xs text-[hsl(var(--gray-300)/0.7)]'>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type='button'
                      onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className='inline-flex items-center justify-center border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[hsl(var(--gray-300)/0.2)] disabled:hover:bg-[hsl(var(--background))]'
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sloth yoga image on the right - with rainbow animation */}
        <div className='flex pointer-events-none flex-shrink-0 w-full pt-12 md:w-1/2 items-center justify-center mt-4 md:mt-0'>
          <ZenSloth />
        </div>
      </div>
    </section>
  );
}

