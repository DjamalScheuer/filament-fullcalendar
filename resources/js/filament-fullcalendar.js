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
    persistedExpandedResources,
    searchConfig,
}) {
    return {
        init() {
            // Remove any non-FullCalendar options from config to avoid runtime warnings
            const sanitizedConfig = { ...(config || {}) }
            if (sanitizedConfig && Object.prototype.hasOwnProperty.call(sanitizedConfig, 'search')) {
                delete sanitizedConfig.search
            }

			// Track currently highlighted event id (persist across re-renders)
			this._highlightedEventId = null

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

			// Preserve user-provided hooks so we can extend them
			const userEventClassNames = eventClassNames
			const userEventDidMount = eventDidMount

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
				eventClassNames: (info) => {
					let classes = []
					// Apply user-provided classes (array or function or string)
					if (Array.isArray(userEventClassNames)) {
						classes = classes.concat(userEventClassNames)
					} else if (typeof userEventClassNames === 'function') {
						const res = userEventClassNames(info)
						if (Array.isArray(res)) {
							classes = classes.concat(res)
						} else if (typeof res === 'string') {
							classes.push(res)
						}
					} else if (typeof userEventClassNames === 'string') {
						classes.push(userEventClassNames)
					}
					// Add highlight class if this is the selected event
					if (this._highlightedEventId != null && String(info.event.id) === String(this._highlightedEventId)) {
						classes.push('fc-event-highlighted')
					}
					return classes
				},
                eventContent,
				eventDidMount: (info) => {
					// Data attribute to easily find the DOM node of an event
					if (info && info.el && info.event && info.event.id != null) {
						info.el.setAttribute('data-event-id', String(info.event.id))
						// Ensure highlight is applied even if classNames not recalculated
						if (this._highlightedEventId != null && String(info.event.id) === String(this._highlightedEventId)) {
							info.el.classList.add('fc-event-highlighted')
						}
					}
					// Call user hook last
					if (typeof userEventDidMount === 'function') {
						userEventDidMount(info)
					}
				},
                eventWillUnmount,
                resourceGroupLabelDidMount: function(info) {
                    // First apply any custom callback
                    if (resourceGroupLabelDidMount && typeof resourceGroupLabelDidMount === 'function') {
                        resourceGroupLabelDidMount(info);
                    }
                    
                    // Tag group label for reliable lookup later
                    try {
                        if (info && info.el && info.groupValue != null) {
                            info.el.setAttribute('data-group-value', String(info.groupValue))
                        }
                    } catch (e) { /* no-op */ }
                    // Do not auto-click here to avoid race/toggle; expansion handled post-render
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

            // Apply persisted expanded groups shortly after initial render to ensure DOM is ready
            try {
                // First try sessionStorage, fallback to server-provided persistedExpandedResources
                let expandedResources = this.getPersistedExpandedGroups()
                if (expandedResources === null) {
                    // First visit or storage cleared – use server default (includes initiallyExpandedResources)
                    expandedResources = Array.isArray(persistedExpandedResources) 
                        ? persistedExpandedResources.map(v => String(v))
                        : []
                }
                
                if (expandedResources.length > 0) {
                    // Single pass; robust detection inside expandGroupsByValues prevents toggling
                    setTimeout(() => this.expandGroupsByValues(expandedResources), 120)
                }
                // Track last saved to avoid redundant calls
                this._lastSavedOpenGroups = expandedResources.slice()

                // Debug helper to inspect available group labels at runtime
                try {
                    window.__fcListGroupLabels = () => {
                        const scope = this.$el || document
                        const labels = Array.from(scope.querySelectorAll('.fc-datagrid [data-group-value]')).map(el => ({
                            value: el.getAttribute('data-group-value'),
                            text: (el.textContent || '').trim(),
                        }))
                        console.table(labels)
                        return labels
                    }
                } catch (_) {}
            } catch (e) { /* no-op */ }

            // Wire up listeners to capture expand/collapse changes
            try {
                const container = this.$el
                if (container) {
                    const saveExpanded = (openGroups) => {
                        // Save to sessionStorage (like view/date persistence)
                        this.persistExpandedGroups(openGroups)
                    }
                    const collectOpenGroups = () => {
                        const scope = container || document
                        const labels = scope.querySelectorAll('.fc-datagrid [data-group-value]')
                        const open = []
                        labels.forEach((label) => {
                            const row = label.closest('tr') || label.closest('.fc-datagrid-row') || label.parentElement
                            const expander = row && row.querySelector ? row.querySelector('.fc-datagrid-expander') : null
                            const icon = expander ? expander.querySelector('.fc-icon') : null
                            // FullCalendar uses minus-square for expanded, plus-square for collapsed
                            const isOpenByIcon = !!(icon && (icon.classList.contains('fc-icon-minus-square') || icon.classList.contains('fc-icon-chevron-down')))
                            // row may have aria-expanded as well
                            const isOpenByRow = row && row.getAttribute && row.getAttribute('aria-expanded') === 'true'
                            const isOpen = isOpenByIcon || isOpenByRow
                            if (isOpen) {
                                const value = label.getAttribute('data-group-value')
                                if (value != null) open.push(String(value))
                            }
                        })
                        // dedupe
                        return Array.from(new Set(open))
                    }
                    const arraysEqual = (a, b) => {
                        if (!Array.isArray(a) || !Array.isArray(b)) return false
                        if (a.length !== b.length) return false
                        for (let i = 0; i < a.length; i++) {
                            if (a[i] !== b[i]) return false
                        }
                        return true
                    }
                    const debouncedSave = ((fn, wait = 300) => {
                        let timer = null
                        return (...args) => {
                            if (timer) clearTimeout(timer)
                            timer = setTimeout(() => fn.apply(this, args), wait)
                        }
                    })(saveExpanded, 250)

                    // Save only when an expander is clicked; compute new state from pre-click DOM (reliable)
                    container.addEventListener('click', (evt) => {
                        const expander = evt.target && evt.target.closest ? evt.target.closest('.fc-datagrid-expander') : null
                        if (!expander) return

                        // Identify group value from the same row
                        const row = expander.closest('tr') || expander.closest('.fc-datagrid-row') || expander.parentElement
                        const labelEl = row ? row.querySelector('[data-group-value]') : null
                        const groupValue = labelEl ? labelEl.getAttribute('data-group-value') : null
                        
                        if (!groupValue) return

                        // Determine current (pre-click) state using icon/aria (pre-toggle)
                        const icon = expander.querySelector('.fc-icon')
                        // FullCalendar uses plus-square for collapsed, minus-square for expanded
                        const isCollapsedPre = !!(icon && (icon.classList.contains('fc-icon-plus-square') || icon.classList.contains('fc-icon-chevron-right'))) || expander.getAttribute('aria-expanded') === 'false'
                        const isExpandedPre = !!(icon && (icon.classList.contains('fc-icon-minus-square') || icon.classList.contains('fc-icon-chevron-down'))) || expander.getAttribute('aria-expanded') === 'true'

                        // Build next set from last saved set
                        const last = Array.isArray(this._lastSavedOpenGroups) ? this._lastSavedOpenGroups.slice() : []
                        const set = new Set(last.map(String))

                        if (isCollapsedPre && !isExpandedPre) {
                            // Will open
                            set.add(String(groupValue))
                        } else {
                            // Will close (or unknown) – remove to be safe
                            set.delete(String(groupValue))
                        }

                        const next = Array.from(set)

                        if (!arraysEqual(next, this._lastSavedOpenGroups || [])) {
                            this._lastSavedOpenGroups = next
                            debouncedSave(next)
                        }
                    }, true)

                    // Debug hooks for manual testing
                    try {
                        window.__fcSaveExpandedGroups = () => {
                            const openGroups = collectOpenGroups()
                            this._lastSavedOpenGroups = openGroups
                            saveExpanded(openGroups)
                        }
                        window.__fcClearExpandedGroups = () => {
                            window.sessionStorage.removeItem(this.getExpandedGroupsStorageKey())
                        }
                    } catch (_) {}
                }
            } catch (e) { /* no-op */ }

			// Inject default highlight style once (safe fallback)
			if (!document.getElementById('fc-event-highlight-style')) {
				const style = document.createElement('style')
				style.id = 'fc-event-highlight-style'
				style.textContent = `
					.fc-event-highlighted {
						outline: 2px solid #f59e0b;
						box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.35) inset;
						border-radius: 4px;
					}
				`
				document.head.appendChild(style)
			}

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

        getExpandedGroupsStorageKey() {
            const path = window.location && window.location.pathname ? window.location.pathname : 'unknown'
            return `filament-fullcalendar:expanded-groups:${path}`
        },

        persistExpandedGroups(groups) {
            try {
                const storageKey = this.getExpandedGroupsStorageKey()
                window.sessionStorage.setItem(storageKey, JSON.stringify(groups || []))
                console.log('[FC] 💾 Saved to sessionStorage:', storageKey, groups)
            } catch (e) {
                console.error('[FC] ❌ Failed to save:', e)
            }
        },

        getPersistedExpandedGroups() {
            try {
                const storageKey = this.getExpandedGroupsStorageKey()
                const stored = window.sessionStorage.getItem(storageKey)
                console.log('[FC] 📂 Loading from sessionStorage:', storageKey, stored)
                if (stored) {
                    const parsed = JSON.parse(stored)
                    return Array.isArray(parsed) ? parsed : []
                }
            } catch (e) {
                console.error('[FC] ❌ Failed to load:', e)
            }
            return null
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
        
		resolveEventResourceIds(calendar, event) {
			const ids = new Set()
			try {
				// 1) From event payload itself
				if (event) {
					if (event.resourceId != null) ids.add(String(event.resourceId))
					if (Array.isArray(event.resourceIds)) event.resourceIds.forEach(id => ids.add(String(id)))
					if (event.resource && event.resource.id != null) ids.add(String(event.resource.id))
					if (event.extendedProps) {
						if (event.extendedProps.resourceId != null) ids.add(String(event.extendedProps.resourceId))
						if (Array.isArray(event.extendedProps.resourceIds)) event.extendedProps.resourceIds.forEach(id => ids.add(String(id)))
						if (event.extendedProps.resource_id != null) ids.add(String(event.extendedProps.resource_id))
					}
				}
				// 2) From calendar's EventApi (after gotoDate refetched current range)
				if (ids.size === 0 && calendar && typeof calendar.getEventById === 'function' && event && event.id != null) {
					const api = calendar.getEventById(String(event.id))
					if (api) {
						if (typeof api.getResources === 'function') {
							const rs = api.getResources()
							rs.forEach(r => { if (r && r.id != null) ids.add(String(r.id)) })
						}
						// Fallback internals (best-effort)
						if (api._def && Array.isArray(api._def.resourceIds)) {
							api._def.resourceIds.forEach(id => ids.add(String(id)))
						}
					}
				}
				// 3) Heuristic match if ID-api not found yet: try by time/title against current calendar events
				if (ids.size === 0 && calendar && typeof calendar.getEvents === 'function') {
					const all = calendar.getEvents ? calendar.getEvents() : []
					// Try by same id (sometimes exists only after async)
					let candidate = all.find(e => String(e.id) === String(event.id))
					if (!candidate) {
						// Try by start and title (loose matching)
						const targetStart = this.parseDateSafe(event.start)
						const targetTitle = (event.title || '').toLowerCase()
						if (targetStart instanceof Date && !isNaN(targetStart)) {
							candidate = all.find(e => {
								const s = e.start
								const t = (e.title || '').toLowerCase()
								// within 10 minutes and same title
								const closeInTime = s instanceof Date && Math.abs(s.getTime() - targetStart.getTime()) <= 10 * 60 * 1000
								return closeInTime && t === targetTitle
							})
						}
					}
					if (candidate) {
						if (typeof candidate.getResources === 'function') {
							const rs = candidate.getResources()
							rs.forEach(r => { if (r && r.id != null) ids.add(String(r.id)) })
						}
						if (candidate._def && Array.isArray(candidate._def.resourceIds)) {
							candidate._def.resourceIds.forEach(id => ids.add(String(id)))
						}
					}
				}
			} catch (e) {
				console.warn('[filament-fullcalendar] resolveEventResourceIds: error', e)
			}
			console.log('[filament-fullcalendar] resolveEventResourceIds:', Array.from(ids))
			return Array.from(ids)
		},
		
		parseDateSafe(value) {
			if (value instanceof Date) return value
			if (typeof value === 'string') {
				// Accept "YYYY-MM-DD HH:mm:ss" by converting space to 'T'
				const isoish = value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value
				const d = new Date(isoish)
				return isNaN(d) ? null : d
			}
			return null
		},
		
		tryExpandForEventWithRetries(calendar, event, attempt = 0) {
			const maxAttempts = 10
			const delayMs = 200
			const resourceIds = this.resolveEventResourceIds(calendar, event)
			if (Array.isArray(resourceIds) && resourceIds.length > 0) {
				this.expandResourceForEventIfAny.call(this, resourceIds)
				return
			}
			if (attempt >= maxAttempts) {
				console.warn('[filament-fullcalendar] could not resolve resource for event after retries')
				return
			}
			setTimeout(() => {
				this.tryExpandForEventWithRetries(calendar, event, attempt + 1)
			}, delayMs)
		},
		
		expandResourceForEventIfAny(resourceIds) {
			try {
				console.log('[filament-fullcalendar] expandResourceForEventIfAny: start', { resourceIds })
				
				// Prefer scoping to this calendar element
				const scope = this.$el || document
				console.log('[filament-fullcalendar] expandResourceForEventIfAny: scope set', { hasEl: !!this.$el })
				
				// If we can find the resource row(s), expand their ancestor groups
				let foundAnyRow = false
				if (Array.isArray(resourceIds) && resourceIds.length > 0) {
					resourceIds.forEach((rid) => {
						// data-resource-id is present on resource rows in resource views
						const row = scope.querySelector(`[data-resource-id="${CSS.escape(rid)}"]`)
						console.log('[filament-fullcalendar] expandResourceForEventIfAny: lookup row', { rid, found: !!row })
						if (row) {
							foundAnyRow = true
							let parent = row.parentElement
							while (parent) {
								const expander = parent.querySelector && parent.querySelector('.fc-datagrid-expander')
								if (expander && !expander.classList.contains('fc-icon-chevron-down')) {
									console.log('[filament-fullcalendar] expandResourceForEventIfAny: clicking ancestor expander to open')
									expander.click()
								}
								parent = parent.parentElement
							}
						}
					})
					console.log('[filament-fullcalendar] expandResourceForEventIfAny: foundAnyRow', foundAnyRow)
				}

				// Fallback: expand all collapsed groups to ensure visibility
				const allExpanders = scope.querySelectorAll('.fc-datagrid-expander')
				console.log('[filament-fullcalendar] expandResourceForEventIfAny: total expanders', allExpanders.length)
				allExpanders.forEach((expander) => {
					if (!expander.classList.contains('fc-icon-chevron-down')) {
						console.log('[filament-fullcalendar] expandResourceForEventIfAny: clicking expander to ensure open')
						expander.click()
					}
				})

				console.log('[filament-fullcalendar] expandResourceForEventIfAny: done', { foundAnyRow })
			} catch (e) {
				console.warn('[filament-fullcalendar] expandResourceForEventIfAny: error', e)
				// best-effort; ignore DOM issues
			}
		},
		
		expandGroupsByValues(groupValues) {
			try {
				const scope = this.$el || document
				if (!Array.isArray(groupValues) || groupValues.length === 0) return

				const findLabelForGroupValue = (gv) => {
					const valueStr = String(gv)
					// 1) Try strict data attribute within datagrid
					let label = scope.querySelector(`.fc-datagrid [data-group-value="${CSS.escape(valueStr)}"]`)
					if (label) return label
					// 2) Try strict data attribute anywhere within scope
					label = scope.querySelector(`[data-group-value="${CSS.escape(valueStr)}"]`)
					if (label) return label
					// 3) Fallback: scan all labeled elements and match by visible text
					const candidates = scope.querySelectorAll('.fc-datagrid [data-group-value]')
					for (const el of candidates) {
						const text = (el.textContent || '').trim()
						if (text === valueStr || text.toLowerCase() === valueStr.toLowerCase()) {
							return el
						}
						// lenient contains match as last resort
						if (text.toLowerCase().includes(valueStr.toLowerCase())) {
							return el
						}
					}
					return null
				}

				// Init session set for idempotence
				if (!this._expandedByPlugin) this._expandedByPlugin = new Set()

				groupValues.forEach((gv) => {
					if (this._expandedByPlugin.has(String(gv))) return
					const label = findLabelForGroupValue(gv)
					if (!label) return
					const row = label.closest('tr') || label.closest('.fc-datagrid-row') || label.parentElement
					const expander = row && row.querySelector ? row.querySelector('.fc-datagrid-expander') : null
					if (expander) {
						const icon = expander.querySelector('.fc-icon')
						// FullCalendar uses plus-square for collapsed, minus-square for expanded
						const isCollapsed = !!(icon && (icon.classList.contains('fc-icon-plus-square') || icon.classList.contains('fc-icon-chevron-right')))
						const isExpanded = !!(icon && (icon.classList.contains('fc-icon-minus-square') || icon.classList.contains('fc-icon-chevron-down')))
						if (isCollapsed && !isExpanded) {
							expander.click()
							this._expandedByPlugin.add(String(gv))
						}
					}
				})
			} catch (e) {
				console.warn('[filament-fullcalendar] expandGroupsByValues: error', e)
			}
		},

		// group-based expansion removed (reverted to simpler logic)

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
					console.log('[filament-fullcalendar] search result click', {
						id: event.id,
						start: event.start,
						resourceId: event.resourceId ?? event?.extendedProps?.resourceId ?? event?.extendedProps?.resource_id,
						resourceIds: event.resourceIds ?? event?.extendedProps?.resourceIds
					})
                    // Jump to event date
                    if (event.start) {
						console.log('[filament-fullcalendar] gotoDate', event.start)
                        calendar.gotoDate(event.start)
                    }
                    
                    // Change to appropriate view
                    const view = calendar.view
                    if (view.type === 'dayGridMonth' || view.type === 'multiMonthYear') {
						console.log('[filament-fullcalendar] changeView to dayGridWeek from', view.type)
                        calendar.changeView('dayGridWeek')
                    }
                    
					// Persistently highlight the selected event
					this._highlightedEventId = event.id
					// Remove any previous highlight from DOM immediately (visual correctness)
					document.querySelectorAll('.fc-event-highlighted').forEach(el => el.classList.remove('fc-event-highlighted'))
					// Re-render events to apply highlight class via hooks
					if (typeof calendar.rerenderEvents === 'function') {
						console.log('[filament-fullcalendar] rerenderEvents() after selecting result')
						calendar.rerenderEvents()
					}
					
					// Ask backend which resource groups to expand for this event id (optional override)
					if (this.$wire && typeof this.$wire.getResourceGroupsForEvent === 'function') {
						try {
							Promise.resolve(this.$wire.getResourceGroupsForEvent(String(event.id)))
								.then((groups) => {
									if (Array.isArray(groups) && groups.length > 0) {
										// Expand requested groups before trying to find the event DOM node
										setTimeout(() => this.expandGroupsByValues(groups), 150)
									}
								})
								.catch(() => { /* ignore */ })
						} catch (e) { /* ignore */ }
					}
					
					// Expand resource groups (if any) so the event row becomes visible
					setTimeout(() => this.tryExpandForEventWithRetries(calendar, event, 0), 200)
					// Scroll into view after render and expansion
					setTimeout(() => {
						const scope = this.$el || document
						const eventEl = scope.querySelector(`[data-event-id="${event.id}"]`)
						console.log('[filament-fullcalendar] locating event element after expansion', { found: !!eventEl })
						if (eventEl) {
							eventEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
							// Ensure class present if rerender missed
							eventEl.classList.add('fc-event-highlighted')
						}
					}, 350)
                    
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
