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
            // Remove any non-FullCalendar options from config to avoid runtime warnings
            const sanitizedConfig = { ...(config || {}) }
            if (sanitizedConfig && Object.prototype.hasOwnProperty.call(sanitizedConfig, 'search')) {
                delete sanitizedConfig.search
            }


            // Restore persisted calendar state (view/date/scroll) from sessionStorage
            const storageKey = this.getCalendarStorageKey()
            let savedState = null
            try {
                savedState = JSON.parse(window.sessionStorage.getItem(storageKey))
            } catch (e) {
                // ignore malformed storage
            }
            if (savedState && typeof savedState === 'object') {
                // Always override with saved state to persist user's last selection
                if (savedState.viewType) {
                    sanitizedConfig.initialView = savedState.viewType
                }
                if (savedState.dateStr) {
                    sanitizedConfig.initialDate = savedState.dateStr
                }
            }

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
                ...sanitizedConfig,
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
                datesSet: (info) => {
                    // Persist view and date whenever the visible range changes
                    try {
                        this.persistCalendarState(info.view.calendar)
                    } catch (e) { /* no-op */ }
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
        
        getCalendarStorageKey() {
            // Key per page; if you have multiple calendars on one page, consider extending this
            const path = window.location && window.location.pathname ? window.location.pathname : 'unknown'
            return `filament-fullcalendar:${path}`
        },

        persistCalendarState(calendar) {
            try {
                const storageKey = this.getCalendarStorageKey()
                const viewType = calendar.view && calendar.view.type ? calendar.view.type : undefined
                const date = calendar.getDate ? calendar.getDate() : undefined
                const dateStr = date instanceof Date ? date.toISOString() : undefined

                const state = { viewType, dateStr }
                window.sessionStorage.setItem(storageKey, JSON.stringify(state))
            } catch (e) {
                // ignore storage errors
            }
        },

        // Removed scroll persistence (not required)

        initializeSearch(calendar) {
            const searchInput = document.getElementById('calendar-search-input')
            const searchResults = document.getElementById('calendar-search-results')
            
            if (!searchInput || !searchResults) {
                return
            }
            
            // Prepare dropdown positioning to avoid clipping on the right
            this._search = { input: searchInput, container: searchResults }
            this._search.positionDropdown = () => {
                const inputRect = searchInput.getBoundingClientRect()
                const viewportWidth = window.innerWidth || document.documentElement.clientWidth
                const maxWidth = Math.min(384, viewportWidth - 16) // 24rem or viewport - 16px
                const rightOffset = Math.max(8, viewportWidth - inputRect.right) // keep at least 8px from edge

                // Use fixed positioning relative to viewport to bypass overflow clipping
                searchResults.style.position = 'fixed'
                searchResults.style.left = 'auto'
                searchResults.style.right = `${rightOffset}px`
                searchResults.style.top = `${Math.round(inputRect.bottom + 8)}px`
                searchResults.style.width = `${Math.round(maxWidth)}px`
            }
            
            const reposition = () => {
                // Only reposition when visible
                if (!searchResults.classList.contains('hidden')) {
                    this._search.positionDropdown()
                }
            }
            window.addEventListener('resize', reposition)
            window.addEventListener('scroll', reposition, true)
            
            // Decide search strategy: prefer server-side if available, else fallback to client-side
            const canUseServerSearch = this.$wire && typeof this.$wire.searchEvents === 'function'
            
            // When falling back to client search, keep an in-memory set of fetched events
            let allEvents = []
            if (!canUseServerSearch) {
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
            }
            
            // Search functionality
            let searchTimeout = null
            let lastSearchToken = 0
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout)
                const query = e.target.value.trim()
                
                const minChars = (this.searchConfig && Number.isInteger(this.searchConfig.minChars)) ? this.searchConfig.minChars : 2
                if (query.length < minChars) {
                    searchResults.classList.add('hidden')
                    return
                }
                
                const debounceMs = (this.searchConfig && Number.isInteger(this.searchConfig.debounce)) ? this.searchConfig.debounce : 300
                searchTimeout = setTimeout(() => {
                    const token = ++lastSearchToken
                    if (canUseServerSearch) {
                        this.performServerSearch(query, calendar, searchResults, token, () => lastSearchToken)
                    } else {
                        this.performClientSearch(query, allEvents, calendar, searchResults, token, () => lastSearchToken)
                    }
                }, debounceMs)
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
                    const token = ++lastSearchToken
                    if (canUseServerSearch) {
                        this.performServerSearch(e.detail.query, calendar, searchResults, token, () => lastSearchToken)
                    } else {
                        this.performClientSearch(e.detail.query, allEvents, calendar, searchResults, token, () => lastSearchToken)
                    }
                }
            })
        },
        
        performClientSearch(query, allEvents, calendar, searchResultsContainer, token, getLastToken) {
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
            
            // Guard against stale responses
            if (token !== getLastToken()) return
            this.renderSearchResults(searchResults, calendar, searchResultsContainer)
        },

        async performServerSearch(query, calendar, searchResultsContainer, token, getLastToken) {
            try {
                const limit = (this.searchConfig && Number.isInteger(this.searchConfig.limit)) ? this.searchConfig.limit : 10
                const results = await this.$wire.searchEvents(query, limit)
                if (token !== getLastToken()) return
                // Expecting an array of events compatible with FullCalendar
                this.renderSearchResults(results || [], calendar, searchResultsContainer)
            } catch (error) {
                if (token !== getLastToken()) return
                // If server search fails, show empty state
                this.renderSearchResults([], calendar, searchResultsContainer)
            }
        },

        renderSearchResults(searchResults, calendar, searchResultsContainer) {
            // Ensure dropdown is positioned to the right of the viewport and not clipped
            if (this._search && typeof this._search.positionDropdown === 'function') {
                this._search.positionDropdown()
            }

            // Display results
            const resultsList = searchResultsContainer.querySelector('ul')
            resultsList.innerHTML = ''
            
            if (!searchResults || searchResults.length === 0) {
                resultsList.innerHTML = '<li class="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">Keine Events gefunden</li>'
                searchResultsContainer.classList.remove('hidden')
                return
            }
            
            // Sort by date (if not already sorted)
            searchResults.sort((a, b) => new Date(a.start) - new Date(b.start))
            
            // Show max 10 results
            searchResults.slice(0, 10).forEach(event => {
                const li = document.createElement('li')
                li.className = 'px-4 py-3 cursor-pointer transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-700'
                
                const eventDate = new Date(event.start)
                const dateStr = isNaN(eventDate.getTime())
                    ? ''
                    : eventDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                const timeStr = isNaN(eventDate.getTime())
                    ? ''
                    : eventDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                
                li.innerHTML = `
                    <div class="flex justify-between items-center gap-3">
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-gray-900 dark:text-gray-100 truncate">${event.title ?? ''}</div>
                            ${dateStr ? `<div class=\"text-sm text-gray-600 dark:text-gray-400\">${dateStr}${timeStr ? ` um ${timeStr} Uhr` : ''}</div>` : ''}
                            ${event.location ? `<div class=\"text-xs text-gray-500 dark:text-gray-500 truncate\">${event.location}</div>` : ''}
                        </div>
                        <svg class="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </div>
                `
                
                li.addEventListener('click', () => {
                    // Jump to event date
                    if (event.start) {
                        calendar.gotoDate(event.start)
                    }
                    
                    // Change to appropriate view
                    const view = calendar.view
                    if (view.type === 'dayGridMonth' || view.type === 'multiMonthYear') {
                        calendar.changeView('dayGridWeek')
                    }
                    
                    // Highlight the event when rendered
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
                    const input = document.getElementById('calendar-search-input')
                    if (input) input.value = ''
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
