/**
 * Track Filter - Client-side post filtering by track category
 * Enables users to filter blog posts by clicking track filter buttons
 */
(function() {
  'use strict';

  // Track-to-keyword mapping
  // Posts contain track values like "Shipped · Stage 1", "Momentum · Track 1", "Planning · This Week"
  const trackKeywords = {
    momentum: ['momentum', 'shipped', 'progress', 'planning'],
    credibility: ['credibility', 'milestone', 'technical'],
    desire: ['desire', 'vision', 'future']
  };

  // DOM elements
  let filterButtons;
  let clearButton;
  let postItems;
  let emptyState;
  let currentFilter = null;

  /**
   * Check if a post's track data matches the filter keywords
   * @param {string} postTrack - The track value from the post's data attribute
   * @param {string} filter - The filter category (momentum, credibility, desire)
   * @returns {boolean} - Whether the post matches the filter
   */
  function matchesTrack(postTrack, filter) {
    if (!postTrack || !filter) return false;
    const keywords = trackKeywords[filter];
    if (!keywords) return false;

    const trackLower = postTrack.toLowerCase();
    return keywords.some(keyword => trackLower.includes(keyword));
  }

  /**
   * Apply filter to show only matching posts
   * @param {string} filter - The filter category to apply
   */
  function applyFilter(filter) {
    currentFilter = filter;
    let visibleCount = 0;

    // Update post visibility
    postItems.forEach(function(post) {
      const postTrack = post.getAttribute('data-track');
      const matches = matchesTrack(postTrack, filter);

      if (matches) {
        post.classList.remove('future-post-list__item--hidden');
        post.setAttribute('aria-hidden', 'false');
        visibleCount++;
      } else {
        post.classList.add('future-post-list__item--hidden');
        post.setAttribute('aria-hidden', 'true');
      }
    });

    // Update button states
    filterButtons.forEach(function(btn) {
      const btnFilter = btn.getAttribute('data-filter');
      const isActive = btnFilter === filter;
      btn.classList.toggle('future-filter-btn--active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    // Show/hide clear button
    clearButton.classList.add('future-filter-clear--visible');
    clearButton.setAttribute('aria-hidden', 'false');

    // Show/hide empty state
    if (visibleCount === 0) {
      emptyState.classList.add('future-empty-state--visible');
      emptyState.setAttribute('aria-hidden', 'false');
    } else {
      emptyState.classList.remove('future-empty-state--visible');
      emptyState.setAttribute('aria-hidden', 'true');
    }

    // Update URL without reload
    updateURL(filter);
  }

  /**
   * Clear the filter and show all posts
   */
  function clearFilter() {
    currentFilter = null;

    // Show all posts
    postItems.forEach(function(post) {
      post.classList.remove('future-post-list__item--hidden');
      post.setAttribute('aria-hidden', 'false');
    });

    // Reset button states
    filterButtons.forEach(function(btn) {
      btn.classList.remove('future-filter-btn--active');
      btn.setAttribute('aria-pressed', 'false');
    });

    // Hide clear button
    clearButton.classList.remove('future-filter-clear--visible');
    clearButton.setAttribute('aria-hidden', 'true');

    // Hide empty state
    emptyState.classList.remove('future-empty-state--visible');
    emptyState.setAttribute('aria-hidden', 'true');

    // Update URL
    updateURL(null);
  }

  /**
   * Update URL to reflect current filter state
   * @param {string|null} filter - The current filter or null
   */
  function updateURL(filter) {
    const url = new URL(window.location);
    if (filter) {
      url.searchParams.set('track', filter);
    } else {
      url.searchParams.delete('track');
    }
    window.history.replaceState({}, '', url);
  }

  /**
   * Get filter from URL parameters
   * @returns {string|null} - The filter from URL or null
   */
  function getFilterFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('track');
  }

  /**
   * Handle filter button click
   * @param {Event} event - The click event
   */
  function handleFilterClick(event) {
    const button = event.currentTarget;
    const filter = button.getAttribute('data-filter');

    // Toggle: if clicking active filter, clear it
    if (currentFilter === filter) {
      clearFilter();
    } else {
      applyFilter(filter);
    }
  }

  /**
   * Initialize the track filter functionality
   */
  function init() {
    // Get DOM elements
    filterButtons = document.querySelectorAll('.future-filter-btn[data-filter]');
    clearButton = document.getElementById('clear-filter');
    postItems = document.querySelectorAll('.future-post-list__item[data-track]');
    emptyState = document.getElementById('empty-state');

    // Exit if not on a page with filter controls
    if (!filterButtons.length || !clearButton || !postItems.length) {
      return;
    }

    // Add event listeners to filter buttons
    filterButtons.forEach(function(btn) {
      btn.addEventListener('click', handleFilterClick);
    });

    // Add event listener to clear button
    clearButton.addEventListener('click', clearFilter);

    // Apply filter from URL if present
    const urlFilter = getFilterFromURL();
    if (urlFilter && trackKeywords[urlFilter]) {
      applyFilter(urlFilter);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
