<?php

namespace App\Filament\Widgets;

use Saade\FilamentFullCalendar\Widgets\FullCalendarWidget;
use Saade\FilamentFullCalendar\Data\EventData;

class ResourceTimelineWidget extends FullCalendarWidget
{
    /**
     * Configure the calendar to use resourceTimeline view with specific resources expanded by default
     */
    public function config(): array
    {
        return [
            'initialView' => 'resourceTimelineMonth',
            'headerToolbar' => [
                'left' => 'prev,next today',
                'center' => 'title',
                'right' => 'resourceTimelineWeek,resourceTimelineMonth,resourceTimelineYear',
            ],
            'resources' => $this->getResources(),
            'resourceGroupField' => 'building', // Group resources by building
            'resourcesInitiallyExpanded' => false, // Start with all groups collapsed
        ];
    }

    /**
     * Define which resource groups should be initially expanded
     * Return an array of group IDs/values that should be expanded by default
     */
    public function getInitiallyExpandedResources(): array
    {
        return [
            'building-a', // Building A will be expanded by default
            'building-c', // Building C will be expanded by default
            // Building B will remain collapsed
        ];
    }

    /**
     * Optionally, you can also use the callback for more complex logic
     */
    public function resourceGroupLabelDidMount(): string
    {
        return <<<JS
            function(info) {
                // Add custom styling or behavior
                if (info.groupValue === 'building-vip') {
                    info.el.style.backgroundColor = '#fef3c7'; // Highlight VIP building
                }
                
                // You can also add custom tooltips
                info.el.setAttribute('title', 'Click to expand/collapse ' + info.groupValue);
            }
        JS;
    }

    /**
     * Provide resources for the timeline view
     */
    protected function getResources(): array
    {
        return [
            // Building A resources
            ['id' => 'a-101', 'building' => 'building-a', 'title' => 'Room A-101'],
            ['id' => 'a-102', 'building' => 'building-a', 'title' => 'Room A-102'],
            ['id' => 'a-103', 'building' => 'building-a', 'title' => 'Room A-103'],
            
            // Building B resources
            ['id' => 'b-201', 'building' => 'building-b', 'title' => 'Room B-201'],
            ['id' => 'b-202', 'building' => 'building-b', 'title' => 'Room B-202'],
            
            // Building C resources
            ['id' => 'c-301', 'building' => 'building-c', 'title' => 'Room C-301'],
            ['id' => 'c-302', 'building' => 'building-c', 'title' => 'Room C-302'],
            ['id' => 'c-303', 'building' => 'building-c', 'title' => 'Room C-303'],
            ['id' => 'c-304', 'building' => 'building-c', 'title' => 'Room C-304'],
            
            // VIP Building
            ['id' => 'vip-1', 'building' => 'building-vip', 'title' => 'VIP Suite 1'],
            ['id' => 'vip-2', 'building' => 'building-vip', 'title' => 'VIP Suite 2'],
        ];
    }

    /**
     * Fetch events for the calendar
     */
    public function fetchEvents(array $fetchInfo): array
    {
        // Example events assigned to specific resources
        return [
            EventData::make()
                ->id(1)
                ->title('Meeting in Room A-101')
                ->start(now())
                ->end(now()->addHours(2))
                ->resourceId('a-101')
                ->toArray(),
                
            EventData::make()
                ->id(2)
                ->title('Workshop in Room B-201')
                ->start(now()->addDays(1))
                ->end(now()->addDays(1)->addHours(4))
                ->resourceId('b-201')
                ->backgroundColor('#10b981')
                ->toArray(),
                
            EventData::make()
                ->id(3)
                ->title('Conference in Room C-301')
                ->start(now()->addDays(2))
                ->end(now()->addDays(2)->addHours(6))
                ->resourceId('c-301')
                ->backgroundColor('#f59e0b')
                ->toArray(),
                
            EventData::make()
                ->id(4)
                ->title('VIP Event')
                ->start(now()->addDays(3))
                ->end(now()->addDays(3)->addHours(3))
                ->resourceId('vip-1')
                ->backgroundColor('#ef4444')
                ->toArray(),
        ];
    }

    /**
     * Don't forget to include the required plugins for resourceTimeline
     */
    protected static function getPlugins(): array
    {
        return [
            'interaction',
            'dayGrid',
            'timeGrid',
            'timeline',
            'resource',
            'resourceTimeline',
        ];
    }
}
