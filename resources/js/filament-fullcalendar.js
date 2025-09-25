import { Calendar } from '@fullcalendar/core'
import interactionPlugin from '@fullcalendar/interaction'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import multiMonthPlugin from '@fullcalendar/multimonth'
import scrollGridPlugin from '@fullcalendar/scrollgrid'
import timelinePlugin from '@fullcalendar/timeline'
import adaptivePlugin from '@fullcalendar/adaptive'
import resourcePlugin from '@fullcalendar/resource'
import resourceDayGridPlugin from '@fullcalendar/resource-daygrid'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'
import rrulePlugin from '@fullcalendar/rrule'
import momentPlugin from '@fullcalendar/moment'
import momentTimezonePlugin from '@fullcalendar/moment-timezone'
import locales from '@fullcalendar/core/locales-all'

export default function fullcalendar({
    locale,
    plugins,
    schedulerLicenseKey,
    timeZone,
    config,
    editable,
    selectable,
    eventClassNames,
    eventContent,
    eventDidMount,
    eventWillUnmount,
    resourceGroupLabelDidMount,
    initiallyExpandedResources,
    searchConfig,
}) {
    return {
        init() {
            /** @type Calendar */
            const calendar = new Calendar(this.$el, {
                headerToolbar: {
                    'left': 'prev,next today',
                    'center': 'title',
                    'right': 'dayGridMonth,dayGridWeek,dayGridDay',
                },
                plugins: plugins.map(plugin => availablePlugins[plugin]),
                locale,
                schedulerLicenseKey,
                timeZone,
                editable,
                selectable,
                ...config,
                locales,
                eventClassNames,
                eventContent,
                eventDidMount,
                eventWillUnmount,
                resourceGroupLabelDidMount: function(info) {
                    // First apply any custom callback
                    if (resourceGroupLabelDidMount && typeof resourceGroupLabelDidMount === 'function') {
                        resourceGroupLabelDidMount(info);
                    }
                    
                    // Then handle automatic expansion based on initiallyExpandedResources
                    if (initiallyExpandedResources && initiallyExpandedResources.length > 0) {
                        // Check if this resource should be initially expanded
                        if (initiallyExpandedResources.includes(info.groupValue) || 
                            initiallyExpandedResources.includes(String(info.groupValue))) {
                            // Find and click the expander element
                            const expander = info.el.querySelector('.fc-datagrid-expander');
                            if (expander && !expander.classList.contains('fc-icon-chevron-down')) {
                                // Only click if it's not already expanded (chevron-down indicates expanded)
                                expander.click();
                            }
                        }
                    }
                },
                events: (info, successCallback, failureCallback) => {
                    this.$wire.fetchEvents({ start: info.startStr, end: info.endStr, timezone: info.timeZone })
                        .then(successCallback)
                        .catch(failureCallback)
                },
                eventClick: ({ event, jsEvent }) => {
                    jsEvent.preventDefault()

                    if (event.url) {
                        const isNotPlainLeftClick = e => (e.which > 1) || (e.altKey) || (e.ctrlKey) || (e.metaKey) || (e.shiftKey)
                        return window.open(event.url, (event.extendedProps.shouldOpenUrlInNewTab || isNotPlainLeftClick(jsEvent)) ? '_blank' : '_self')
                    }

                    this.$wire.onEventClick(event)
                },
                eventDrop: async ({ event, oldEvent, relatedEvents, delta, oldResource, newResource, revert }) => {
                    const shouldRevert = await this.$wire.onEventDrop(event, oldEvent, relatedEvents, delta, oldResource, newResource)

                    if (typeof shouldRevert === 'boolean' && shouldRevert) {
                        revert()
                    }
                },
                eventResize: async ({ event, oldEvent, relatedEvents, startDelta, endDelta, revert }) => {
                    const shouldRevert = await this.$wire.onEventResize(event, oldEvent, relatedEvents, startDelta, endDelta)

                    if (typeof shouldRevert === 'boolean' && shouldRevert) {
                        revert()
                    }
                },
                dateClick: ({ dateStr, allDay, view, resource }) => {
                    if (!selectable) return;
                    this.$wire.onDateSelect(dateStr, null, allDay, view, resource)
                },
                select: ({ startStr, endStr, allDay, view, resource }) => {
                    if (!selectable) return;
                    this.$wire.onDateSelect(startStr, endStr, allDay, view, resource)
                },
            })

            calendar.render()

            // Initialize search functionality if enabled
            if (searchConfig && searchConfig.enabled) {
                this.initializeSearch(calendar)
            }

            window.addEventListener('filament-fullcalendar--refresh', () => calendar.refetchEvents())
            window.addEventListener('filament-fullcalendar--prev', () => calendar.prev())
            window.addEventListener('filament-fullcalendar--next', () => calendar.next())
            window.addEventListener('filament-fullcalendar--today', () => calendar.today())
            window.addEventListener('filament-fullcalendar--goto', (event) => calendar.gotoDate(event.detail.date))
            
            // Listener für dynamische Resource-Updates
            window.addEventListener('update-calendar-resources', (event) => {
                if (event.detail && event.detail.resources) {
                    // Aktualisiere Resources ohne kompletten Re-render
                    calendar.refetchResources()
                    
                    // Alternative: Setze neue Resources direkt
                    // calendar.setOption('resources', event.detail.resources)
                }
            })
            
            // Livewire Event Listener für Resource Updates
            Livewire.on('update-calendar-resources', (event) => {
                console.log('Update calendar resources event received:', event);
                
                // Handle array structure from Livewire
                let resources;
                if (Array.isArray(event)) {
                    // Livewire sendet als Array [{resources: [...]}]
                    resources = event[0]?.resources;
                } else {
                    // Falls als Objekt gesendet
                    resources = event?.resources;
                }
                
                console.log('Extracted resources:', resources);
                
                if (resources && Array.isArray(resources)) {
                    console.log('Updating calendar with', resources.length, 'resources');
                    calendar.setOption('resources', resources);
                    calendar.refetchEvents();
                    console.log('Calendar updated successfully');
                } else {
                    console.error('Invalid resources data:', resources);
                }
            })
        },
        
        initializeSearch(calendar) {
            const searchInput = document.getElementById('calendar-search-input')
            const searchResults = document.getElementById('calendar-search-results')
            
            if (!searchInput || !searchResults) {
                return
            }
            
            // Store all events for searching
            let allEvents = []
            
            // Update stored events whenever calendar fetches new events
            const originalEventsFetch = calendar.getOption('events')
            calendar.setOption('events', async (info, successCallback, failureCallback) => {
                try {
                    const events = await this.$wire.fetchEvents({ 
                        start: info.startStr, 
                        end: info.endStr, 
                        timezone: info.timeZone 
                    })
                    
                    // Store events for search
                    allEvents = [...allEvents, ...events]
                    // Remove duplicates based on event id
                    allEvents = allEvents.filter((event, index, self) =>
                        index === self.findIndex(e => e.id === event.id)
                    )
                    
                    successCallback(events)
                } catch (error) {
                    failureCallback(error)
                }
            })
            
            // Search functionality
            let searchTimeout = null
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout)
                const query = e.target.value.trim()
                
                if (query.length === 0) {
                    searchResults.classList.add('hidden')
                    return
                }
                
                searchTimeout = setTimeout(() => {
                    this.performSearch(query, allEvents, calendar, searchResults)
                }, 300)
            })
            
            // Close search results when clicking outside
            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                    searchResults.classList.add('hidden')
                }
            })
            
            // Listen for calendar-search event
            document.addEventListener('calendar-search', (e) => {
                if (e.detail && e.detail.query) {
                    this.performSearch(e.detail.query, allEvents, calendar, searchResults)
                }
            })
        },
        
        performSearch(query, allEvents, calendar, searchResultsContainer) {
            const searchResults = allEvents.filter(event => {
                const searchableText = [
                    event.title || '',
                    event.description || '',
                    event.location || ''
                ].join(' ').toLowerCase()
                
                return searchableText.includes(query.toLowerCase())
            })
            
            // Sort by date
            searchResults.sort((a, b) => new Date(a.start) - new Date(b.start))
            
            // Display results
            const resultsList = searchResultsContainer.querySelector('ul')
            resultsList.innerHTML = ''
            
            if (searchResults.length === 0) {
                resultsList.innerHTML = '<li class="px-4 py-2 text-gray-500 dark:text-gray-400">No events found</li>'
                searchResultsContainer.classList.remove('hidden')
                return
            }
            
            // Show max 10 results
            searchResults.slice(0, 10).forEach(event => {
                const li = document.createElement('li')
                li.className = 'px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                
                const eventDate = new Date(event.start)
                const dateStr = eventDate.toLocaleDateString()
                const timeStr = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                
                li.innerHTML = `
                    <div class="flex justify-between items-center">
                        <div>
                            <div class="font-semibold text-gray-900 dark:text-gray-100">${event.title}</div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">${dateStr} at ${timeStr}</div>
                            ${event.location ? `<div class="text-xs text-gray-400 dark:text-gray-500">${event.location}</div>` : ''}
                        </div>
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </div>
                `
                
                li.addEventListener('click', () => {
                    // Jump to event date
                    calendar.gotoDate(event.start)
                    
                    // Change to appropriate view
                    const view = calendar.view
                    if (view.type === 'dayGridMonth' || view.type === 'multiMonthYear') {
                        // Switch to week or day view for better visibility
                        calendar.changeView('dayGridWeek')
                    }
                    
                    // Highlight the event
                    setTimeout(() => {
                        const eventEl = document.querySelector(`[data-event-id="${event.id}"]`)
                        if (eventEl) {
                            eventEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
                            eventEl.classList.add('fc-event-highlighted')
                            setTimeout(() => {
                                eventEl.classList.remove('fc-event-highlighted')
                            }, 2000)
                        }
                    }, 100)
                    
                    // Hide search results
                    searchResultsContainer.classList.add('hidden')
                    
                    // Clear search input
                    document.getElementById('calendar-search-input').value = ''
                })
                
                resultsList.appendChild(li)
            })
            
            searchResultsContainer.classList.remove('hidden')
        },
    }
}

const availablePlugins = {
    'interaction': interactionPlugin,
    'dayGrid': dayGridPlugin,
    'timeGrid': timeGridPlugin,
    'list': listPlugin,
    'multiMonth': multiMonthPlugin,
    'scrollGrid': scrollGridPlugin,
    'timeline': timelinePlugin,
    'adaptive': adaptivePlugin,
    'resource': resourcePlugin,
    'resourceDayGrid': resourceDayGridPlugin,
    'resourceTimeline': resourceTimelinePlugin,
    'resourceTimeGrid': resourceTimeGridPlugin,
    'rrule': rrulePlugin,
    'moment': momentPlugin,
    'momentTimezone': momentTimezonePlugin,
}
