@php
    $plugin = \Saade\FilamentFullCalendar\FilamentFullCalendarPlugin::get();
    $config = $this->getConfig();
    if (is_array($config) && array_key_exists('search', $config)) {
        unset($config['search']);
    }
@endphp

<x-filament-widgets::widget>
    <x-filament::section>
        <div class="flex items-center mb-4 gap-4">
            <x-filament-actions::actions :actions="$this->getCachedHeaderActions()" class="shrink-0" />
            
            @if($this->getSearchConfig()['enabled'] ?? false)
                <div class="relative ml-auto">
                    <input 
                        type="text" 
                        id="calendar-search-input"
                        placeholder="{{ $this->getSearchConfig()['placeholder'] ?? 'Search events...' }}"
                        x-data="{ searchResults: [] }"
                        x-on:input.debounce.{{ $this->getSearchConfig()['debounce'] ?? 300 }}="$dispatch('calendar-search', { query: $event.target.value })"
                        class="w-64 pl-10 pr-4 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                    >
                    
                    <div 
                        id="calendar-search-results" 
                        class="hidden absolute right-0 z-50 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700"
                        wire:ignore
                    >
                        <ul class="py-2 max-h-64 overflow-y-auto"></ul>
                    </div>
                </div>
            @endif
        </div>

        <div class="filament-fullcalendar" wire:ignore x-load
            x-load-src="{{ \Filament\Support\Facades\FilamentAsset::getAlpineComponentSrc('filament-fullcalendar-alpine', 'saade/filament-fullcalendar') }}"
            ax-load-css="{{ \Filament\Support\Facades\FilamentAsset::getStyleHref('filament-fullcalendar-styles', 'saade/filament-fullcalendar') }}"
            x-ignore x-data="fullcalendar({
                locale: @js($plugin->getLocale()),
                plugins: @js($plugin->getPlugins()),
                schedulerLicenseKey: @js($plugin->getSchedulerLicenseKey()),
                timeZone: @js($plugin->getTimezone()),
                config: @js($config),
                editable: @json($plugin->isEditable()),
                selectable: @json($plugin->isSelectable()),
                eventClassNames: {!! htmlspecialchars($this->eventClassNames(), ENT_COMPAT) !!},
                eventContent: {!! htmlspecialchars($this->eventContent(), ENT_COMPAT) !!},
                eventDidMount: {!! htmlspecialchars($this->eventDidMount(), ENT_COMPAT) !!},
                eventWillUnmount: {!! htmlspecialchars($this->eventWillUnmount(), ENT_COMPAT) !!},
                resourceGroupLabelDidMount: {!! htmlspecialchars($this->resourceGroupLabelDidMount(), ENT_COMPAT) !!},
                resourceLabelContent: {!! htmlspecialchars($this->resourceLabelContent(), ENT_COMPAT) !!},
                resourceLabelDidMount: {!! htmlspecialchars($this->resourceLabelDidMount(), ENT_COMPAT) !!},
                resourceLaneContent: {!! htmlspecialchars($this->resourceLaneContent(), ENT_COMPAT) !!},
                resourceLaneDidMount: {!! htmlspecialchars($this->resourceLaneDidMount(), ENT_COMPAT) !!},
                persistedExpandedResources: @js($this->getPersistedExpandedResources()),
                searchConfig: @js($this->getSearchConfig()),
            })">
        </div>
    </x-filament::section>

    <x-filament-actions::modals />
</x-filament-widgets::widget>
