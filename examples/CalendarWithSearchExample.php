<?php

namespace App\Filament\Widgets;

use Carbon\Carbon;
use Saade\FilamentFullCalendar\Widgets\FullCalendarWidget;

class CalendarWithSearchExample extends FullCalendarWidget
{
    protected static ?string $heading = 'Calendar with Search';

    // OPTION 1: Configure search via config() method (RECOMMENDED)
    // No mount() method needed!

    /**
     * Fetch events for the calendar
     */
    public function fetchEvents(array $info): array
    {
        // Example events - in a real app, these would come from your database
        return [
            [
                'id' => 1,
                'title' => 'Team Meeting',
                'description' => 'Weekly team sync meeting',
                'location' => 'Conference Room A',
                'start' => Carbon::now()->setTime(10, 0),
                'end' => Carbon::now()->setTime(11, 0),
                'color' => '#3b82f6',
            ],
            [
                'id' => 2,
                'title' => 'Project Deadline',
                'description' => 'Q1 project deliverables due',
                'location' => 'Remote',
                'start' => Carbon::now()->addDays(3)->setTime(17, 0),
                'end' => Carbon::now()->addDays(3)->setTime(18, 0),
                'color' => '#ef4444',
            ],
            [
                'id' => 3,
                'title' => 'Client Presentation',
                'description' => 'Quarterly review with client',
                'location' => 'Client Office',
                'start' => Carbon::now()->addDays(5)->setTime(14, 0),
                'end' => Carbon::now()->addDays(5)->setTime(16, 0),
                'color' => '#10b981',
            ],
            [
                'id' => 4,
                'title' => 'Training Session',
                'description' => 'New software training for team',
                'location' => 'Training Room',
                'start' => Carbon::now()->addWeek()->setTime(9, 0),
                'end' => Carbon::now()->addWeek()->setTime(12, 0),
                'color' => '#f59e0b',
            ],
            [
                'id' => 5,
                'title' => 'Company Event',
                'description' => 'Annual company celebration',
                'location' => 'Grand Ballroom',
                'start' => Carbon::now()->addWeeks(2)->setTime(18, 0),
                'end' => Carbon::now()->addWeeks(2)->setTime(22, 0),
                'color' => '#8b5cf6',
            ],
            [
                'id' => 6,
                'title' => 'Development Sprint Review',
                'description' => 'Sprint retrospective and planning',
                'location' => 'Dev Room',
                'start' => Carbon::now()->addDays(14)->setTime(15, 0),
                'end' => Carbon::now()->addDays(14)->setTime(17, 0),
                'color' => '#06b6d4',
            ],
            [
                'id' => 7,
                'title' => 'Marketing Campaign Launch',
                'description' => 'Q2 marketing campaign kickoff',
                'location' => 'Marketing Hub',
                'start' => Carbon::now()->addMonth()->setTime(10, 0),
                'end' => Carbon::now()->addMonth()->setTime(11, 30),
                'color' => '#ec4899',
            ],
            [
                'id' => 8,
                'title' => 'Board Meeting',
                'description' => 'Quarterly board review',
                'location' => 'Board Room',
                'start' => Carbon::now()->addMonths(1)->addDays(5)->setTime(13, 0),
                'end' => Carbon::now()->addMonths(1)->addDays(5)->setTime(15, 0),
                'color' => '#6366f1',
            ],
            [
                'id' => 9,
                'title' => 'Product Demo',
                'description' => 'New product features demonstration',
                'location' => 'Demo Lab',
                'start' => Carbon::now()->addWeeks(3)->setTime(14, 0),
                'end' => Carbon::now()->addWeeks(3)->setTime(15, 30),
                'color' => '#14b8a6',
            ],
            [
                'id' => 10,
                'title' => 'Team Building Activity',
                'description' => 'Outdoor team building exercise',
                'location' => 'City Park',
                'start' => Carbon::now()->addMonth()->addDays(10)->setTime(9, 0),
                'end' => Carbon::now()->addMonth()->addDays(10)->setTime(17, 0),
                'color' => '#84cc16',
            ],
        ];
    }

    /**
     * Override the search method to implement custom search logic
     * (Optional - the default implementation searches title, description, and location)
     */
    public function searchEvents(string $query): array
    {
        if (empty($query)) {
            return [];
        }

        // Get all events
        $allEvents = $this->fetchEvents([
            'start' => now()->subMonths(6)->toISOString(),
            'end' => now()->addMonths(6)->toISOString(),
            'timezone' => config('app.timezone'),
        ]);

        // Custom search logic - search in multiple fields
        $searchResults = collect($allEvents)->filter(function ($event) use ($query) {
            $searchableFields = [
                $event['title'] ?? '',
                $event['description'] ?? '',
                $event['location'] ?? '',
            ];

            $searchText = implode(' ', $searchableFields);
            
            // Case-insensitive search
            return str_contains(strtolower($searchText), strtolower($query));
        })->sortBy('start')->take(10)->values()->toArray();

        return $searchResults;
    }

    /**
     * Calendar configuration with search enabled
     */
    public function config(): array
    {
        return [
            // Search configuration - NEW!
            'search' => [
                'enabled' => true,
                'placeholder' => 'Search events by title, description or location...',
                'debounce' => 300, // milliseconds
            ],
            
            // Regular calendar configuration
            'headerToolbar' => [
                'left' => 'prev,next today',
                'center' => 'title',
                'right' => 'dayGridMonth,timeGridWeek,timeGridDay',
            ],
            'navLinks' => true,
            'editable' => true,
            'selectable' => true,
            'dayMaxEvents' => true,
            'handleWindowResize' => true,
            'eventDisplay' => 'block',
        ];
    }
    
    /* OPTION 2: Configure search via mount() method (if you need more dynamic control)
    
    public function mount(): void
    {
        parent::mount();
        
        // Enable the search functionality
        $this->enableSearch(true)
            ->searchPlaceholder('Search events by title, description or location...')
            ->searchDebounce(300); // milliseconds
    }
    */
}
