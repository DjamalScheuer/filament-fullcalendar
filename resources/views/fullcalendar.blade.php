@php
    $plugin = \Saade\FilamentFullCalendar\FilamentFullCalendarPlugin::get();
@endphp

<x-filament-widgets::widget>
    <x-filament::section>
        <div class="flex justify-between items-center mb-4">
            @if($this->getSearchConfig()['enabled'] ?? false)
                <div class="flex items-center gap-2 flex-1 max-w-md">
                    <div class="relative flex-1">
                        <input 
                            type="text" 
                            id="calendar-search-input"
                            placeholder="{{ $this->getSearchConfig()['placeholder'] ?? 'Search events...' }}"
                            wire:model.live.debounce.{{ $this->getSearchConfig()['debounce'] ?? 300 }}ms="searchQuery"
                            x-data="{ searchResults: [] }"
                            x-on:input.debounce.{{ $this->getSearchConfig()['debounce'] ?? 300 }}="$dispatch('calendar-search', { query: $event.target.value })"
                            class="w-full px-4 py-2 pr-10 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                        <svg class="absolute right-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    <div 
                        id="calendar-search-results" 
                        class="hidden absolute z-50 mt-12 w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700"
                        wire:ignore
                    >
                        <ul class="py-2 max-h-64 overflow-y-auto"></ul>
                    </div>
                </div>
            @else
                <div></div>
            @endif
            <x-filament-actions::actions :actions="$this->getCachedHeaderActions()" class="shrink-0" />
        </div>

        <div class="filament-fullcalendar" wire:ignore x-load
            x-load-src="{{ \Filament\Support\Facades\FilamentAsset::getAlpineComponentSrc('filament-fullcalendar-alpine', 'saade/filament-fullcalendar') }}"
            ax-load-css="{{ \Filament\Support\Facades\FilamentAsset::getStyleHref('filament-fullcalendar-styles', 'saade/filament-fullcalendar') }}"
            x-ignore x-data="fullcalendar({
                locale: @js($plugin->getLocale()),
                plugins: @js($plugin->getPlugins()),
                schedulerLicenseKey: @js($plugin->getSchedulerLicenseKey()),
                timeZone: @js($plugin->getTimezone()),
                config: @js($this->getConfig()),
                editable: @json($plugin->isEditable()),
                selectable: @json($plugin->isSelectable()),
                eventClassNames: {!! htmlspecialchars($this->eventClassNames(), ENT_COMPAT) !!},
                eventContent: {!! htmlspecialchars($this->eventContent(), ENT_COMPAT) !!},
                eventDidMount: {!! htmlspecialchars($this->eventDidMount(), ENT_COMPAT) !!},
                eventWillUnmount: {!! htmlspecialchars($this->eventWillUnmount(), ENT_COMPAT) !!},
                resourceGroupLabelDidMount: {!! htmlspecialchars($this->resourceGroupLabelDidMount(), ENT_COMPAT) !!},
                initiallyExpandedResources: @js($this->getInitiallyExpandedResources()),
                searchConfig: @js($this->getSearchConfig()),
            })">
        </div>
    </x-filament::section>

    <x-filament-actions::modals />
</x-filament-widgets::widget>
