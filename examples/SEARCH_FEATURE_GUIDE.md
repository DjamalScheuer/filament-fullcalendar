# Calendar Search Feature Guide

## Overview

The Calendar Search feature allows users to search for events within the calendar and automatically navigate to the event's date and time when selected. This feature includes:

- Real-time event search
- Automatic navigation to event dates
- Visual highlighting of selected events
- Configurable search options
- Dark mode support

## Basic Usage

### 1. Enable Search in Your Widget

```php
<?php

namespace App\Filament\Widgets;

use Saade\FilamentFullCalendar\Widgets\FullCalendarWidget;

class MyCalendarWidget extends FullCalendarWidget
{
    public function mount(): void
    {
        parent::mount();
        
        // Enable search with default settings
        $this->enableSearch();
    }
}
```

### 2. Configure Search Options

```php
public function mount(): void
{
    parent::mount();
    
    $this->enableSearch(true)
        ->searchPlaceholder('Search events...') // Custom placeholder text
        ->searchDebounce(300); // Debounce time in milliseconds
}
```

## Features

### Search Functionality

- **Real-time Search**: As users type, the search results update automatically
- **Multi-field Search**: Searches across event title, description, and location
- **Sorted Results**: Results are sorted by date (earliest first)
- **Limited Results**: Shows up to 10 results to keep the UI clean

### Navigation Features

When a user clicks on a search result:

1. **Automatic Date Navigation**: The calendar jumps to the event's date
2. **View Switching**: If in month view, automatically switches to week view for better visibility
3. **Event Highlighting**: The selected event pulses with a highlight animation for 2 seconds
4. **Smooth Scrolling**: The event is scrolled into view smoothly
5. **Search Clear**: The search input is automatically cleared

## Customization

### Custom Search Logic

Override the `searchEvents` method to implement custom search logic:

```php
public function searchEvents(string $query): array
{
    if (empty($query)) {
        return [];
    }

    // Implement your custom search logic here
    $results = Event::where('title', 'like', "%{$query}%")
        ->orWhere('description', 'like', "%{$query}%")
        ->orderBy('start_date')
        ->limit(10)
        ->get()
        ->map(function ($event) {
            return [
                'id' => $event->id,
                'title' => $event->title,
                'start' => $event->start_date,
                'end' => $event->end_date,
                'description' => $event->description,
                'location' => $event->location,
            ];
        })
        ->toArray();

    return $results;
}
```

### Styling

The search feature includes default styles that work with both light and dark modes. You can customize the appearance by overriding these CSS classes:

```css
/* Search input styling */
#calendar-search-input {
    /* Your custom styles */
}

/* Search results dropdown */
#calendar-search-results {
    /* Your custom styles */
}

/* Highlighted event animation */
.fc-event-highlighted {
    animation: pulse 2s ease-in-out;
    box-shadow: 0 0 15px rgba(var(--primary-500), 0.5);
}
```

## Configuration Options

| Method | Description | Default |
|--------|-------------|---------|
| `enableSearch(bool $enabled)` | Enable/disable search functionality | `false` |
| `searchPlaceholder(string $text)` | Set placeholder text for search input | `'Search events...'` |
| `searchDebounce(int $ms)` | Set debounce time for search input | `300` |

## Example Implementation

See `examples/CalendarWithSearchExample.php` for a complete working example.

## Browser Compatibility

The search feature uses modern JavaScript and CSS features. It's compatible with:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Considerations

- **Event Caching**: Events are cached in the browser for faster searching
- **Debouncing**: Search input is debounced to reduce unnecessary searches
- **Limited Results**: Only 10 results are shown to maintain performance
- **Lazy Loading**: Search results are only rendered when needed

## Troubleshooting

### Search not appearing
- Ensure `enableSearch()` is called in the `mount()` method
- Check that JavaScript assets are compiled (`npm run build`)

### Events not found
- Verify that events have searchable fields (title, description, location)
- Check the date range in your `fetchEvents` method

### Navigation not working
- Ensure event dates are in valid format
- Check that the calendar view supports the date range
