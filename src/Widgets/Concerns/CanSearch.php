<?php

namespace Saade\FilamentFullCalendar\Widgets\Concerns;

trait CanSearch
{
    /**
     * Whether the search field is enabled
     */
    protected bool $searchEnabled = false;

    /**
     * The placeholder text for the search field
     */
    protected string $searchPlaceholder = 'Search events...';

    /**
     * The debounce time in milliseconds for the search input
     */
    protected int $searchDebounce = 300;

    /**
     * Enable the search functionality
     */
    public function enableSearch(bool $enabled = true): static
    {
        $this->searchEnabled = $enabled;
        return $this;
    }

    /**
     * Set the search placeholder text
     */
    public function searchPlaceholder(string $placeholder): static
    {
        $this->searchPlaceholder = $placeholder;
        return $this;
    }

    /**
     * Set the search debounce time in milliseconds
     */
    public function searchDebounce(int $milliseconds): static
    {
        $this->searchDebounce = $milliseconds;
        return $this;
    }

    /**
     * Check if search is enabled
     */
    public function isSearchEnabled(): bool
    {
        return $this->searchEnabled;
    }

    /**
     * Get the search placeholder text
     */
    public function getSearchPlaceholder(): string
    {
        return $this->searchPlaceholder;
    }

    /**
     * Get the search debounce time
     */
    public function getSearchDebounce(): int
    {
        return $this->searchDebounce;
    }

    /**
     * Search events based on query
     * Override this method to implement custom search logic
     */
    public function searchEvents(string $query): array
    {
        if (empty($query)) {
            return [];
        }

        // Get all events from the current view
        $info = [
            'start' => now()->subMonths(6)->toISOString(),
            'end' => now()->addMonths(6)->toISOString(),
            'timezone' => config('app.timezone'),
        ];

        $allEvents = $this->fetchEvents($info);
        
        // Filter events based on the search query
        $searchResults = array_filter($allEvents, function($event) use ($query) {
            $searchableFields = [
                $event['title'] ?? '',
                $event['description'] ?? '',
                $event['location'] ?? '',
            ];

            $searchText = implode(' ', $searchableFields);
            
            return stripos($searchText, $query) !== false;
        });

        // Sort results by date
        usort($searchResults, function($a, $b) {
            return strtotime($a['start']) - strtotime($b['start']);
        });

        // Limit to first 10 results
        return array_slice($searchResults, 0, 10);
    }

    /**
     * Get search configuration for JavaScript
     */
    public function getSearchConfig(): array
    {
        // Check if search is configured in config() method
        $config = $this->getConfig();
        
        if (isset($config['search']) && is_array($config['search'])) {
            return array_merge([
                'enabled' => true,
                'placeholder' => 'Search events...',
                'debounce' => 300,
            ], $config['search']);
        }
        
        // Fallback to trait properties
        return [
            'enabled' => $this->isSearchEnabled(),
            'placeholder' => $this->getSearchPlaceholder(),
            'debounce' => $this->getSearchDebounce(),
        ];
    }
}
