/**
 * CVS Garage — Forum Client Application Controller
 * High-performance, reactive UI architecture for the Forum Service.
 */

import { api } from './api.js';

class ForumApp {
  constructor() {
    this.currentView = 'feed';
    this.currentPostId = null;
    this.selectedCommunitySlug = null;
    this.feedFilter = 'all';
    this.activeTag = null;
    this.searchQuery = '';
    this.currentUser = null;
    this.availableProfiles = [];
    this.posts = [];
    this.communities = [];
    this.mentors = [];
    this.tags = [];
    this.projects = [];
    this.events = [];

    this.init();
  }

  async init() {
    this.initTheme();
    await this.loadAuthContext();
    this.bindGlobalEvents();
    await this.loadInitialData();
    this.handleRoute();
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  // ==========================================
  // THEME MANAGEMENT
  // ==========================================
  initTheme() {
    const savedTheme = localStorage.getItem('forum_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('forum_theme', next);
    this.showToast(`Switched to ${next} mode`);
  }

  // ==========================================
  // AUTH & IDENTITY SWITCHER
  // ==========================================
  async loadAuthContext() {
    const res = await api.getCurrentUser();
    if (res?.success) {
      this.currentUser = res.data.currentUser;
      this.availableProfiles = res.data.availableProfiles;
    } else {
      // Fallback
      this.currentUser = {
        id: api.currentUserId,
        name: 'Rahul Sharma',
        role: 'Student',
        department: 'Computer Science & Engineering',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
      };
      this.availableProfiles = [this.currentUser];
    }
    this.renderHeaderUser();
  }

  switchUser(userId) {
    api.setUserId(userId);
    this.showToast('Switching active member identity...');
    setTimeout(() => {
      window.location.reload();
    }, 200);
  }

  // ==========================================
  // DATA LOADING
  // ==========================================
  async loadInitialData() {
    try {
      const [commsRes, mentorsRes, tagsRes, projRes, evtRes] = await Promise.all([
        api.getCommunities(),
        api.getMentors(),
        api.getTags(),
        api.searchProjects(),
        api.searchEvents()
      ]);

      if (commsRes?.success) this.communities = commsRes.data;
      if (mentorsRes?.success) this.mentors = mentorsRes.data;
      if (tagsRes?.success) this.tags = tagsRes.data;
      if (projRes?.success) this.projects = projRes.data;
      if (evtRes?.success) this.events = evtRes.data;

      this.renderSidebarWidgets();
    } catch (e) {
      console.error('Error loading initial forum data:', e);
    }
  }

  async loadPosts() {
    const params = {};
    if (this.feedFilter === 'trending') params.sort = 'trending';
    else if (this.feedFilter === 'unanswered') params.sort = 'unanswered';
    else if (this.feedFilter === 'solved') params.status = 'solved';
    else if (this.feedFilter === 'following') params.followingOnly = 'true';
    else if (this.feedFilter === 'bookmarks') params.bookmarkedOnly = 'true';

    if (this.selectedCommunitySlug) params.community = this.selectedCommunitySlug;
    if (this.activeTag) params.tag = this.activeTag;
    if (this.searchQuery) params.search = this.searchQuery;

    const res = await api.getPosts(params);
    if (res?.success) {
      this.posts = res.data;
    }
    this.renderFeed();
  }

  // ==========================================
  // ROUTING
  // ==========================================
  handleRoute() {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith('posts/')) {
      const postId = hash.split('/')[1];
      this.currentView = 'detail';
      this.currentPostId = postId;
      this.renderPostDetail(postId);
    } else if (hash === 'new') {
      this.currentView = 'create';
      this.renderCreatePost();
    } else if (hash === 'communities') {
      this.currentView = 'communities';
      this.renderCommunitiesHub();
    } else if (hash === 'mentors') {
      this.currentView = 'mentors';
      this.renderMentorsHub();
    } else if (hash === 'bookmarks') {
      this.currentView = 'feed';
      this.feedFilter = 'bookmarks';
      this.loadPosts();
    } else if (hash === 'moderation') {
      this.currentView = 'moderation';
      this.renderModerationQueue();
    } else {
      this.currentView = 'feed';
      this.loadPosts();
    }

    this.updateActiveNav();
  }

  navigateTo(hash) {
    window.location.hash = hash;
  }

  // ==========================================
  // EVENT BINDINGS
  // ==========================================
  bindGlobalEvents() {
    // Search with debounce
    const searchInput = document.getElementById('global-search');
    let debounceTimer;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.searchQuery = e.target.value.trim();
          if (this.currentView !== 'feed') {
            this.navigateTo('');
          } else {
            this.loadPosts();
          }
        }, 300);
      });
    }

    // Role switcher
    const roleSelect = document.getElementById('role-switcher-select');
    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => {
        this.switchUser(e.target.value);
      });
    }

    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }
  }

  // ==========================================
  // RENDERERS
  // ==========================================

  renderHeaderUser() {
    const user = this.currentUser;
    const select = document.getElementById('role-switcher-select');
    if (select && this.availableProfiles.length) {
      select.innerHTML = this.availableProfiles
        .map(
          (p) =>
            `<option value="${p.id}" ${p.id === user.id ? 'selected' : ''}>
              ${p.name} (${p.role})
            </option>`
        )
        .join('');
    }

    const avatar = document.getElementById('header-avatar');
    if (avatar && user.avatarUrl) {
      avatar.src = user.avatarUrl;
    }
  }

  renderSidebarWidgets() {
    // Trending Tags Widget
    const tagsContainer = document.getElementById('sidebar-tags-list');
    if (tagsContainer && this.tags.length) {
      tagsContainer.innerHTML = this.tags
        .slice(0, 7)
        .map(
          (t) =>
            `<button class="tag-pill" onclick="app.filterByTag('${t.slug}')">
              #${t.name} <span style="opacity:0.6">(${t.postCount})</span>
            </button>`
        )
        .join('');
    }

    // Featured Mentors Widget
    const mentorsContainer = document.getElementById('sidebar-mentors-list');
    if (mentorsContainer && this.mentors.length) {
      mentorsContainer.innerHTML = this.mentors
        .slice(0, 3)
        .map(
          (m) =>
            `<div class="mentor-mini-card">
              <img src="${m.avatarUrl}" class="author-avatar" style="width:32px;height:32px;" alt="${m.name}"/>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:0.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);">${m.department}</div>
              </div>
              <button class="btn-secondary" style="font-size:0.7rem;padding:0.25rem 0.5rem;" onclick="app.openAskMentorModal('${m.id}')">Ask</button>
            </div>`
        )
        .join('');
    }

    // Communities in left nav
    const commNav = document.getElementById('nav-communities-list');
    if (commNav && this.communities.length) {
      commNav.innerHTML = this.communities
        .map(
          (c) =>
            `<li>
              <button class="nav-item-btn ${this.selectedCommunitySlug === c.slug ? 'active' : ''}" onclick="app.filterByCommunity('${c.slug}')">
                <span style="font-size:1.1rem;">${this.getCommunityIcon(c.iconUrl)}</span>
                <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.name}</span>
              </button>
            </li>`
        )
        .join('');
    }
  }

  getCommunityIcon(icon) {
    const map = { brain: '🧠', globe: '🌐', cpu: '🤖', navigation: '📍', zap: '⚡' };
    return map[icon] || '💬';
  }

  renderFeed() {
    const container = document.getElementById('content-area');
    if (!container) return;

    let filterLabel = 'All Discussions';
    if (this.selectedCommunitySlug) {
      const c = this.communities.find((x) => x.slug === this.selectedCommunitySlug);
      filterLabel = `Community: ${c ? c.name : this.selectedCommunitySlug}`;
    } else if (this.activeTag) {
      filterLabel = `Tagged: #${this.activeTag}`;
    } else if (this.searchQuery) {
      filterLabel = `Search: "${this.searchQuery}"`;
    }

    container.innerHTML = `
      <div class="feed-header">
        <div class="feed-tabs-row">
          <div class="tabs-group">
            <button class="feed-tab ${this.feedFilter === 'all' && !this.selectedCommunitySlug && !this.activeTag ? 'active' : ''}" onclick="app.setFeedFilter('all')">All</button>
            <button class="feed-tab ${this.feedFilter === 'trending' ? 'active' : ''}" onclick="app.setFeedFilter('trending')">Trending</button>
            <button class="feed-tab ${this.feedFilter === 'unanswered' ? 'active' : ''}" onclick="app.setFeedFilter('unanswered')">Unanswered</button>
            <button class="feed-tab ${this.feedFilter === 'solved' ? 'active' : ''}" onclick="app.setFeedFilter('solved')">Solved</button>
            <button class="feed-tab ${this.feedFilter === 'following' ? 'active' : ''}" onclick="app.setFeedFilter('following')">Following</button>
          </div>
          ${
            this.selectedCommunitySlug || this.activeTag || this.searchQuery
              ? `<button class="btn-secondary" style="font-size:0.75rem;" onclick="app.clearFilters()">Clear Filters ✕</button>`
              : ''
          }
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
          <h2 style="font-size:1.15rem;font-weight:700;color:var(--text-main);">${filterLabel}</h2>
          <span style="font-size:0.8rem;color:var(--text-muted);">${this.posts.length} discussions</span>
        </div>
      </div>

      <div class="posts-stream">
        ${
          this.posts.length === 0
            ? `<div class="post-card" style="padding:2.5rem;text-align:center;display:flex;flex-direction:column;align-items:center;gap:0.75rem;">
                <span style="font-size:2rem;">🔍</span>
                <h3 style="font-weight:700;">No discussions found</h3>
                <p style="color:var(--text-muted);font-size:0.875rem;">Be the first to ask a question or start an innovation discussion!</p>
                <button class="btn-primary" onclick="app.navigateTo('new')">+ Start Discussion</button>
              </div>`
            : this.posts.map((post) => this.renderPostCard(post)).join('')
        }
      </div>
    `;
  }

  renderPostCard(post) {
    const isSolved = post.status === 'solved';
    const isUpvoted = post.userVote === 1;
    const isDownvoted = post.userVote === -1;
    const isBookmarked = post.isBookmarked;

    return `
      <div class="post-card" id="card-${post.id}">
        <!-- Voting Bar -->
        <div class="vote-col">
          <button class="vote-btn ${isUpvoted ? 'upvoted' : ''}" onclick="app.handleVote('post', '${post.id}', 1)" title="Upvote">
            ▲
          </button>
          <span class="vote-score" id="score-post-${post.id}">${post.voteScore}</span>
          <button class="vote-btn ${isDownvoted ? 'downvoted' : ''}" onclick="app.handleVote('post', '${post.id}', -1)" title="Downvote">
            ▼
          </button>
        </div>

        <!-- Post Content -->
        <div class="post-main">
          <div class="post-meta-top">
            <span class="type-badge ${post.postType}">${post.postType}</span>
            ${isSolved ? `<span class="solved-pill">✓ Solved</span>` : ''}
            <span>•</span>
            <span class="author-link">
              <img src="${post.author?.avatarUrl || 'https://via.placeholder.com/24'}" class="author-avatar" alt=""/>
              <span>${post.author?.name || 'Member'}</span>
              ${post.author?.isMentor ? `<span class="mentor-tag">Mentor</span>` : ''}
            </span>
            <span>•</span>
            <span>${this.formatTimeAgo(post.createdAt)}</span>
            ${post.community ? `<span>in <strong>${post.community.name}</strong></span>` : ''}
          </div>

          <h3 class="post-title" onclick="app.navigateTo('posts/${post.id}')">${this.escapeHtml(post.title)}</h3>
          <p class="post-excerpt" onclick="app.navigateTo('posts/${post.id}')">${this.escapeHtml(post.content)}</p>

          <!-- Linked Ecosystem Entities -->
          <div class="linked-context-row">
            ${
              post.linkedProject
                ? `<span class="linked-badge project" title="Linked to Project Management">
                    📦 Project: <strong>${this.escapeHtml(post.linkedProject.name)}</strong>
                   </span>`
                : ''
            }
            ${
              post.linkedEvent
                ? `<span class="linked-badge event" title="Linked to Event Management">
                    ⚡ Event: <strong>${this.escapeHtml(post.linkedEvent.title)}</strong>
                   </span>`
                : ''
            }
            ${
              post.ideaExport
                ? `<span class="linked-badge idea-exported" title="Exported to Idea Centre">
                    💡 Idea Centre: <strong>#${post.ideaExport.ideaId}</strong> (${post.ideaExport.status})
                   </span>`
                : ''
            }
          </div>

          <!-- Tags -->
          <div class="tags-row">
            ${(post.tags || [])
              .map(
                (t) =>
                  `<button class="tag-pill" onclick="app.filterByTag('${t.slug}')">#${t.name}</button>`
              )
              .join('')}
          </div>

          <!-- Actions Footer -->
          <div class="post-actions-row">
            <div class="actions-left">
              <button class="action-btn" onclick="app.navigateTo('posts/${post.id}')">
                💬 ${post.replyCount} replies
              </button>
              <button class="action-btn ${isBookmarked ? 'active' : ''}" onclick="app.handleBookmark('${post.id}')" title="Save discussion">
                ${isBookmarked ? '🔖 Saved' : '📑 Save'}
              </button>
              <button class="action-btn" onclick="app.handleShare('${post.id}')" title="Share link">
                🔗 Share
              </button>
            </div>
            <div class="actions-right">
              ${
                post.ideaExport
                  ? `<span style="font-size:0.75rem;color:var(--idea-color);font-weight:600;">✓ In Idea Centre</span>`
                  : `<button class="btn-export-idea" onclick="app.openExportModal('${post.id}')">
                      💡 Export to Idea Centre
                     </button>`
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // POST DETAIL SCREEN
  // ==========================================
  async renderPostDetail(postId) {
    const container = document.getElementById('content-area');
    if (!container) return;

    container.innerHTML = `<div style="padding:3rem;text-align:center;">Loading discussion details...</div>`;

    const [postRes, repliesRes] = await Promise.all([
      api.getPostById(postId),
      api.getReplies(postId)
    ]);

    if (!postRes?.success || !postRes.data) {
      container.innerHTML = `
        <div class="post-card" style="padding:2rem;text-align:center;">
          <h3>Post not found or unavailable.</h3>
          <button class="btn-primary" style="margin-top:1rem;" onclick="app.navigateTo('')">← Back to Feed</button>
        </div>
      `;
      return;
    }

    const post = postRes.data;
    const replies = repliesRes?.data || [];
    const isAuthor = post.authorId === this.currentUser.id;
    const isModOrAdmin = ['Admin', 'Community Moderator'].includes(this.currentUser.role);
    const canManageSolution = isAuthor || isModOrAdmin;

    container.innerHTML = `
      <div class="post-detail-view">
        <button class="btn-secondary" style="align-self:flex-start;" onclick="app.navigateTo('')">
          ← Back to Discussions
        </button>

        <div class="detail-card">
          <div class="detail-header">
            <div>
              <div class="post-meta-top" style="margin-bottom:0.5rem;">
                <span class="type-badge ${post.postType}">${post.postType}</span>
                ${post.status === 'solved' ? `<span class="solved-pill">✓ Solved</span>` : ''}
                <span>•</span>
                <span class="author-link">
                  <img src="${post.author?.avatarUrl}" class="author-avatar" alt=""/>
                  <strong>${post.author?.name}</strong> (${post.author?.department})
                  ${post.author?.isMentor ? `<span class="mentor-tag">Mentor</span>` : ''}
                </span>
                <span>•</span>
                <span>${this.formatTimeAgo(post.createdAt)}</span>
              </div>
              <h1 class="post-full-title">${this.escapeHtml(post.title)}</h1>
            </div>

            <div style="display:flex;gap:0.5rem;">
              <button class="btn-secondary" onclick="app.openReportModal('post', '${post.id}')" title="Report">🚩 Flag</button>
            </div>
          </div>

          <!-- Linked Entity Banners -->
          ${
            post.linkedProject
              ? `<div style="background:var(--project-bg);border:1px solid var(--project-border);padding:0.75rem 1rem;border-radius:var(--radius-md);margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;">
                  <div>
                    <span style="font-size:0.75rem;font-weight:700;color:var(--project-color);text-transform:uppercase;">Connected Project</span>
                    <div style="font-weight:700;color:var(--text-main);">${this.escapeHtml(post.linkedProject.name)}</div>
                    <div style="font-size:0.8rem;color:var(--text-secondary);">${this.escapeHtml(post.linkedProject.tagline)}</div>
                  </div>
                  <span class="linked-badge project">Project Portal →</span>
                </div>`
              : ''
          }

          ${
            post.linkedEvent
              ? `<div style="background:var(--event-bg);border:1px solid var(--event-border);padding:0.75rem 1rem;border-radius:var(--radius-md);margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;">
                  <div>
                    <span style="font-size:0.75rem;font-weight:700;color:var(--event-color);text-transform:uppercase;">Connected Event</span>
                    <div style="font-weight:700;color:var(--text-main);">${this.escapeHtml(post.linkedEvent.title)}</div>
                  </div>
                  <span class="linked-badge event">Event Schedule →</span>
                </div>`
              : ''
          }

          <!-- Post Content -->
          <div class="post-content-body">
            ${this.renderMarkdown(post.content)}
          </div>

          <!-- Tags -->
          <div class="tags-row" style="margin-top:1.25rem;">
            ${(post.tags || [])
              .map((t) => `<button class="tag-pill" onclick="app.filterByTag('${t.slug}')">#${t.name}</button>`)
              .join('')}
          </div>

          <!-- Interaction Bar -->
          <div class="post-actions-row" style="margin-top:1.25rem;">
            <div class="actions-left">
              <button class="vote-btn ${post.userVote === 1 ? 'upvoted' : ''}" onclick="app.handleVote('post', '${post.id}', 1)">▲ Upvote (${post.voteScore})</button>
              <button class="vote-btn ${post.userVote === -1 ? 'downvoted' : ''}" onclick="app.handleVote('post', '${post.id}', -1)">▼ Downvote</button>
              <button class="action-btn ${post.isBookmarked ? 'active' : ''}" onclick="app.handleBookmark('${post.id}')">
                ${post.isBookmarked ? '🔖 Saved' : '📑 Save'}
              </button>
              <button class="action-btn" onclick="app.handleShare('${post.id}')">🔗 Share</button>
            </div>
            <div class="actions-right">
              ${
                post.ideaExport
                  ? `<div class="linked-badge idea-exported">
                      💡 Exported to Idea Centre (#${post.ideaExport.ideaId})
                     </div>`
                  : `<button class="btn-primary" style="background-color:var(--idea-color);box-shadow:none;" onclick="app.openExportModal('${post.id}')">
                      💡 Export to Idea Centre
                     </button>`
              }
            </div>
          </div>
        </div>

        <!-- Accepted Solution Banner (If Solved) -->
        ${
          post.acceptedReply
            ? `
            <div class="accepted-solution-card">
              <div class="solution-header-bar">
                <span style="font-size:1.25rem;">✓</span>
                <span>ACCEPTED SOLUTION</span>
                <span style="font-size:0.75rem;color:var(--text-muted);font-weight:normal;">Marked by post author</span>
              </div>
              <div class="post-meta-top" style="margin-bottom:0.5rem;">
                <span class="author-link">
                  <img src="${post.acceptedReply.author?.avatarUrl}" class="author-avatar" alt=""/>
                  <strong>${post.acceptedReply.author?.name}</strong>
                  ${post.acceptedReply.author?.isMentor ? `<span class="mentor-tag">Mentor</span>` : ''}
                </span>
                <span>•</span>
                <span>${this.formatTimeAgo(post.acceptedReply.createdAt)}</span>
              </div>
              <div style="font-size:0.9rem;line-height:1.6;">
                ${this.renderMarkdown(post.acceptedReply.content)}
              </div>
            </div>`
            : ''
        }

        <!-- Replies Section -->
        <div class="replies-section">
          <h3 style="font-size:1.15rem;font-weight:700;">
            Answers & Discussion (${replies.length})
          </h3>

          <!-- Reply Composer -->
          <div class="post-card" style="padding:1.25rem;flex-direction:column;gap:0.75rem;">
            <div style="font-weight:600;font-size:0.875rem;">Your Answer / Contribution</div>
            <textarea id="reply-input-text" rows="3" placeholder="Provide a helpful solution, reference code, or architectural feedback..."></textarea>
            <div style="display:flex;justify-content:flex-end;">
              <button class="btn-primary" onclick="app.submitReply('${post.id}')">Post Answer</button>
            </div>
          </div>

          <!-- Replies List -->
          <div id="replies-list-container">
            ${
              replies.length === 0
                ? `<div style="padding:2rem;text-align:center;color:var(--text-muted);">No replies yet. Be the first to provide a solution!</div>`
                : replies.map((reply) => this.renderReplyTree(reply, post, canManageSolution, 0)).join('')
            }
          </div>
        </div>
      </div>
    `;
  }

  renderReplyTree(reply, post, canManageSolution, depth = 0) {
    const isAccepted = reply.isAcceptedSolution;
    const indentClass = depth === 1 ? 'reply-indent-1' : depth >= 2 ? 'reply-indent-2' : '';

    return `
      <div class="reply-card ${indentClass}" id="reply-${reply.id}">
        <!-- Vote -->
        <div class="vote-col" style="background:transparent;width:32px;">
          <button class="vote-btn ${reply.userVote === 1 ? 'upvoted' : ''}" onclick="app.handleVote('reply', '${reply.id}', 1)">▲</button>
          <span class="vote-score" style="font-size:0.75rem;">${reply.voteScore}</span>
          <button class="vote-btn ${reply.userVote === -1 ? 'downvoted' : ''}" onclick="app.handleVote('reply', '${reply.id}', -1)">▼</button>
        </div>

        <!-- Body -->
        <div style="flex:1;display:flex;flex-direction:column;gap:0.4rem;">
          <div class="post-meta-top">
            <span class="author-link">
              <img src="${reply.author?.avatarUrl}" class="author-avatar" style="width:18px;height:18px;" alt=""/>
              <strong>${reply.author?.name}</strong>
              ${reply.author?.isMentor ? `<span class="mentor-tag">Mentor</span>` : ''}
            </span>
            <span>•</span>
            <span>${this.formatTimeAgo(reply.createdAt)}</span>
            ${isAccepted ? `<span class="solved-pill">✓ Accepted Solution</span>` : ''}
          </div>

          <div style="font-size:0.875rem;line-height:1.5;color:var(--text-main);">
            ${this.renderMarkdown(reply.content)}
          </div>

          <!-- Reply Actions -->
          <div style="display:flex;align-items:center;gap:0.75rem;margin-top:0.4rem;font-size:0.75rem;">
            ${
              canManageSolution && !isAccepted
                ? `<button class="btn-secondary" style="font-size:0.7rem;padding:0.2rem 0.5rem;color:var(--solved-color);" onclick="app.markAccepted('${post.id}', '${reply.id}')">
                    ✓ Accept as Solution
                   </button>`
                : ''
            }
            <button class="action-btn" style="font-size:0.7rem;" onclick="app.toggleReplyBox('${reply.id}')">Reply</button>
            <button class="action-btn" style="font-size:0.7rem;" onclick="app.openReportModal('reply', '${reply.id}')">Report</button>
          </div>

          <!-- Inline Nested Reply Box -->
          <div id="inline-reply-box-${reply.id}" style="display:none;margin-top:0.5rem;">
            <textarea id="inline-reply-text-${reply.id}" rows="2" style="width:100%;margin-bottom:0.4rem;" placeholder="Reply to ${reply.author?.name}..."></textarea>
            <div style="display:flex;gap:0.4rem;">
              <button class="btn-primary" style="font-size:0.75rem;padding:0.3rem 0.6rem;" onclick="app.submitNestedReply('${post.id}', '${reply.id}')">Submit</button>
              <button class="btn-secondary" style="font-size:0.75rem;padding:0.3rem 0.6rem;" onclick="app.toggleReplyBox('${reply.id}')">Cancel</button>
            </div>
          </div>

          <!-- Children / Nested Replies -->
          ${
            reply.children && reply.children.length
              ? `<div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:0.5rem;">
                  ${reply.children.map((child) => this.renderReplyTree(child, post, canManageSolution, depth + 1)).join('')}
                 </div>`
              : ''
          }
        </div>
      </div>
    `;
  }

  // ==========================================
  // CREATE POST STUDIO
  // ==========================================
  renderCreatePost() {
    const container = document.getElementById('content-area');
    if (!container) return;

    container.innerHTML = `
      <div class="detail-card" style="max-width:800px;margin:0 auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
          <h2 style="font-size:1.35rem;font-weight:700;">Start a Discussion / Ask a Question</h2>
          <button class="btn-secondary" onclick="app.navigateTo('')">Cancel</button>
        </div>

        <form id="create-post-form" onsubmit="event.preventDefault(); app.submitNewPost();">
          <!-- Post Type Selector -->
          <div class="form-group">
            <label class="form-label">Discussion Type</label>
            <select id="new-post-type" onchange="app.handlePostTypeChange(this.value)">
              <option value="question">Question (Technical Doubt / Bug)</option>
              <option value="problem">Problem (System / Algorithmic Challenge)</option>
              <option value="idea">Idea (Ready for Community Brainstorming)</option>
              <option value="discussion">Open Discussion (Architecture / Tech)</option>
              ${['Mentor', 'Admin', 'Community Moderator'].includes(this.currentUser.role) ? `<option value="announcement">Announcement (Official Platform Notice)</option>` : ''}
            </select>
          </div>

          <!-- Title -->
          <div class="form-group">
            <label class="form-label">Discussion Title</label>
            <input type="text" id="new-post-title" required placeholder="e.g. How should we structure indoor BLE positioning for Project Alpha?" />
          </div>

          <!-- Community -->
          <div class="form-group">
            <label class="form-label">Community / Group (Optional)</label>
            <select id="new-post-community">
              <option value="">-- General Campus Hub --</option>
              ${this.communities.map((c) => `<option value="${c.id}">${c.name} (${c.category})</option>`).join('')}
            </select>
          </div>

          <!-- General Content Box (Default) -->
          <div class="form-group" id="general-content-group">
            <label class="form-label">Body / Description</label>
            <textarea id="new-post-content" rows="6" placeholder="Provide background, stack traces, expected vs actual behavior, or design considerations..."></textarea>
          </div>

          <!-- Dynamic Structured Fields for Idea Type -->
          <div id="idea-structured-fields" style="display:none;background:var(--idea-bg);border:1px solid var(--idea-border);padding:1rem;border-radius:var(--radius-md);margin-bottom:1rem;">
            <div style="font-weight:700;color:var(--idea-color);font-size:0.85rem;margin-bottom:0.75rem;">
              💡 Structured Idea Blueprint (Prepares for Idea Centre Export)
            </div>
            <div class="form-group">
              <label class="form-label">Problem Statement</label>
              <textarea id="idea-problem" rows="2" placeholder="What campus/societal friction does this solve?"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Proposed Solution</label>
              <textarea id="idea-solution" rows="3" placeholder="How does your proposed technology work?"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Expected Impact</label>
              <input type="text" id="idea-impact" placeholder="e.g. Reduces administrative waiting time by 90%..." />
            </div>
          </div>

          <!-- Cross-Module Linking -->
          <div style="background:var(--bg-subtle);border:1px solid var(--border-default);padding:1rem;border-radius:var(--radius-md);margin-bottom:1rem;">
            <div style="font-weight:700;font-size:0.85rem;margin-bottom:0.5rem;">🔗 Cross-Module Integration Links</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
              <div class="form-group">
                <label class="form-label">Link to Project</label>
                <select id="new-post-project">
                  <option value="">-- No Linked Project --</option>
                  ${this.projects.map((p) => `<option value="${p.id}">${p.name} (#${p.id})</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Link to Event / Hackathon</label>
                <select id="new-post-event">
                  <option value="">-- No Linked Event --</option>
                  ${this.events.map((e) => `<option value="${e.id}">${e.title}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div class="form-group">
            <label class="form-label">Tags (comma-separated)</label>
            <input type="text" id="new-post-tags" placeholder="e.g. React, IoT, PyTorch, Hackathon 2026" />
          </div>

          <div style="display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1.5rem;">
            <button type="button" class="btn-secondary" onclick="app.navigateTo('')">Cancel</button>
            <button type="submit" class="btn-primary">Publish Discussion</button>
          </div>
        </form>
      </div>
    `;
  }

  handlePostTypeChange(type) {
    const generalBox = document.getElementById('general-content-group');
    const ideaBox = document.getElementById('idea-structured-fields');
    if (type === 'idea') {
      generalBox.style.display = 'none';
      ideaBox.style.display = 'block';
    } else {
      generalBox.style.display = 'block';
      ideaBox.style.display = 'none';
    }
  }

  async submitNewPost() {
    const type = document.getElementById('new-post-type').value;
    const title = document.getElementById('new-post-title').value.trim();
    const communityId = document.getElementById('new-post-community').value || null;
    const linkedProjectId = document.getElementById('new-post-project').value || null;
    const linkedEventId = document.getElementById('new-post-event').value || null;
    const rawTags = document.getElementById('new-post-tags').value;
    const tagNames = rawTags.split(',').map((t) => t.trim()).filter(Boolean);

    let content = '';
    let structuredIdea = null;

    if (type === 'idea') {
      const prob = document.getElementById('idea-problem').value.trim();
      const sol = document.getElementById('idea-solution').value.trim();
      const impact = document.getElementById('idea-impact').value.trim();
      if (!prob || !sol) {
        alert('Please fill out both the Problem Statement and Proposed Solution for your idea.');
        return;
      }
      content = `### Problem Statement\n${prob}\n\n### Proposed Solution\n${sol}\n\n### Expected Impact\n${impact || 'N/A'}`;
      structuredIdea = { problemStatement: prob, proposedSolution: sol, expectedImpact: impact, techStack: tagNames };
    } else {
      content = document.getElementById('new-post-content').value.trim();
      if (!content) {
        alert('Please provide description content for your post.');
        return;
      }
    }

    const payload = {
      postType: type,
      title,
      content,
      communityId,
      linkedProjectId,
      linkedEventId,
      tagNames,
      structuredIdea
    };

    const res = await api.createPost(payload);
    if (res?.success) {
      this.showToast('Discussion published successfully!');
      this.navigateTo(`posts/${res.data.id}`);
    } else {
      alert(`Error publishing post: ${res?.error?.message || 'Unknown error'}`);
    }
  }

  // ==========================================
  // COMMUNITIES HUB
  // ==========================================
  async renderCommunitiesHub() {
    const container = document.getElementById('content-area');
    if (!container) return;

    container.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <h2 style="font-size:1.35rem;font-weight:700;">Tech Communities & Guilds</h2>
        <p style="color:var(--text-muted);font-size:0.875rem;">Collaborate with students, faculty mentors, and project teams across campus.</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(290px, 1fr));gap:1rem;">
        ${this.communities
          .map(
            (c) => `
          <div class="widget-card" style="display:flex;flex-direction:column;justify-content:space-between;gap:0.75rem;">
            <div>
              <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
                <span style="font-size:1.6rem;">${this.getCommunityIcon(c.iconUrl)}</span>
                <div>
                  <h3 style="font-size:1rem;font-weight:700;">${this.escapeHtml(c.name)}</h3>
                  <span class="type-badge discussion" style="font-size:0.65rem;">${c.category}</span>
                </div>
              </div>
              <p style="font-size:0.825rem;color:var(--text-secondary);line-height:1.45;margin-bottom:0.75rem;">
                ${this.escapeHtml(c.description)}
              </p>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border-subtle);padding-top:0.6rem;font-size:0.75rem;color:var(--text-muted);">
              <span>👥 ${c.memberCount} members • 💬 ${c.postCount} posts</span>
              <button class="btn-secondary" style="font-size:0.75rem;" onclick="app.filterByCommunity('${c.slug}')">View Feed →</button>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  // ==========================================
  // MENTOR DISCOVERY
  // ==========================================
  async renderMentorsHub() {
    const container = document.getElementById('content-area');
    if (!container) return;

    container.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <h2 style="font-size:1.35rem;font-weight:700;">Faculty & Peer Mentors</h2>
        <p style="color:var(--text-muted);font-size:0.875rem;">Find guidance for technical architecture, research publications, hackathons, and grants.</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:1rem;">
        ${this.mentors
          .map(
            (m) => `
          <div class="widget-card" style="display:flex;flex-direction:column;gap:0.75rem;">
            <div style="display:flex;align-items:center;gap:0.75rem;">
              <img src="${m.avatarUrl}" class="author-avatar" style="width:48px;height:48px;" alt="${m.name}"/>
              <div>
                <div style="display:flex;align-items:center;gap:0.35rem;">
                  <h3 style="font-size:1rem;font-weight:700;">${m.name}</h3>
                  <span class="mentor-tag">Mentor</span>
                </div>
                <div style="font-size:0.75rem;color:var(--text-muted);">${m.department}</div>
              </div>
            </div>

            <p style="font-size:0.825rem;color:var(--text-secondary);line-height:1.4;">${m.bio}</p>

            <div style="display:flex;flex-wrap:wrap;gap:0.3rem;">
              ${(m.mentorExpertise || [])
                .map((e) => `<span class="tag-pill" style="background:var(--primary-50);color:var(--primary-700);">✓ ${e}</span>`)
                .join('')}
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border-subtle);padding-top:0.6rem;margin-top:auto;">
              <span style="font-size:0.75rem;color:var(--text-muted);">
                🏆 ${m.stats?.helpfulAnswersCount || 0} accepted answers
              </span>
              <button class="btn-primary" style="font-size:0.75rem;padding:0.3rem 0.75rem;" onclick="app.openAskMentorModal('${m.id}')">
                Ask Question
              </button>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  // ==========================================
  // MODERATION QUEUE
  // ==========================================
  async renderModerationQueue() {
    const container = document.getElementById('content-area');
    if (!container) return;

    if (!['Admin', 'Community Moderator'].includes(this.currentUser.role)) {
      container.innerHTML = `
        <div class="post-card" style="padding:2.5rem;text-align:center;">
          <h3>Access Restricted</h3>
          <p style="color:var(--text-muted);margin:0.5rem 0 1rem 0;">You need Community Moderator or Platform Admin privileges to view the moderation queue.</p>
          <p style="font-size:0.8rem;color:var(--primary-600);">Tip: Use the Identity Selector in the header to switch to Vikramaditya Sen (Admin).</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `<div style="padding:2rem;">Loading moderation cases...</div>`;

    const res = await api.getReports();
    const reports = res?.data || [];

    container.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <h2 style="font-size:1.35rem;font-weight:700;">Community Safety & Moderation Queue</h2>
        <p style="color:var(--text-muted);font-size:0.875rem;">Review flagged discussions, comments, and violations.</p>
      </div>

      <div class="posts-stream">
        ${
          reports.length === 0
            ? `<div class="post-card" style="padding:2.5rem;text-align:center;">
                <h3>Queue is clean! ✓</h3>
                <p style="color:var(--text-muted);font-size:0.875rem;">No unresolved community reports pending.</p>
               </div>`
            : reports.map((r) => `
                <div class="post-card" style="padding:1.25rem;flex-direction:column;gap:0.75rem;">
                  <div style="display:flex;align-items:center;justify-content:space-between;">
                    <span class="type-badge problem">Reason: ${r.reason}</span>
                    <span style="font-size:0.75rem;color:var(--text-muted);">${this.formatTimeAgo(r.createdAt)}</span>
                  </div>
                  <div style="font-size:0.875rem;"><strong>Reporter Notes:</strong> ${this.escapeHtml(r.notes || 'None')}</div>
                  ${r.targetContent ? `<div style="background:var(--bg-subtle);padding:0.75rem;border-radius:var(--radius-sm);font-size:0.8rem;">Content: "${this.escapeHtml(r.targetContent.title || r.targetContent.content || '')}"</div>` : ''}
                  <div style="display:flex;justify-content:flex-end;gap:0.5rem;">
                    <button class="btn-secondary" onclick="app.resolveReport('${r.id}', 'dismiss')">Dismiss</button>
                    <button class="btn-primary" style="background:var(--danger-color);" onclick="app.resolveReport('${r.id}', 'resolve')">Take Action & Resolve</button>
                  </div>
                </div>
              `).join('')
        }
      </div>
    `;
  }

  // ==========================================
  // ACTIONS & INTERACTIONS
  // ==========================================
  async handleVote(targetType, targetId, value) {
    const res = await api.castVote(targetType, targetId, value);
    if (res?.success) {
      const scoreElem = document.getElementById(`score-${targetType}-${targetId}`);
      if (scoreElem) {
        scoreElem.textContent = res.data.newScore;
      }
      this.showToast(value === 1 ? 'Upvoted!' : value === -1 ? 'Downvoted' : 'Vote cleared');
      // If in detail view or feed, sync
      if (this.currentView === 'feed') {
        const p = this.posts.find((x) => x.id === targetId);
        if (p) {
          p.voteScore = res.data.newScore;
          p.userVote = res.data.userVote;
          this.renderFeed();
        }
      }
    }
  }

  async handleBookmark(postId) {
    const res = await api.toggleBookmark(postId);
    if (res?.success) {
      this.showToast(res.data.isBookmarked ? 'Discussion saved to bookmarks' : 'Removed from bookmarks');
      const p = this.posts.find((x) => x.id === postId);
      if (p) p.isBookmarked = res.data.isBookmarked;
      if (this.currentView === 'feed') this.renderFeed();
    }
  }

  async handleShare(postId) {
    const url = `${window.location.origin}${window.location.pathname}#posts/${postId}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      this.showToast('Canonical link copied to clipboard!');
    } else {
      prompt('Share this canonical URL:', url);
    }
  }

  async submitReply(postId) {
    const input = document.getElementById('reply-input-text');
    const content = input?.value.trim();
    if (!content) {
      alert('Answer cannot be empty.');
      return;
    }

    const res = await api.createReply(postId, { content });
    if (res?.success) {
      this.showToast('Answer posted!');
      this.renderPostDetail(postId);
    } else {
      alert(res?.error?.message || 'Failed to submit reply');
    }
  }

  toggleReplyBox(replyId) {
    const box = document.getElementById(`inline-reply-box-${replyId}`);
    if (box) {
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
    }
  }

  async submitNestedReply(postId, parentReplyId) {
    const input = document.getElementById(`inline-reply-text-${parentReplyId}`);
    const content = input?.value.trim();
    if (!content) return;

    const res = await api.createReply(postId, { content, parentReplyId });
    if (res?.success) {
      this.showToast('Reply added to thread!');
      this.renderPostDetail(postId);
    }
  }

  async markAccepted(postId, replyId) {
    if (!confirm('Mark this answer as the Accepted Solution for the community?')) return;

    const res = await api.markAcceptedSolution(postId, replyId);
    if (res?.success) {
      this.showToast('Answer marked as Accepted Solution! Question is now Solved ✓');
      this.renderPostDetail(postId);
    } else {
      alert(res?.error?.message || 'Failed to mark accepted solution');
    }
  }

  // ==========================================
  // EXPORT TO IDEA CENTRE MODAL (CRITICAL)
  // ==========================================
  async openExportModal(postId) {
    const post = this.posts.find((p) => p.id === postId) || (await api.getPostById(postId))?.data;
    if (!post) return;

    if (post.ideaExport) {
      alert(`This discussion has already been exported to Idea Centre as #${post.ideaExport.ideaId}.`);
      return;
    }

    const modal = document.getElementById('global-modal-container');
    if (!modal) return;

    modal.innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target === this) app.closeModal();">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">💡 Export to Idea Centre</h3>
            <button class="btn-icon" onclick="app.closeModal()">✕</button>
          </div>

          <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:1rem;">
            You are promoting this community discussion into an official <strong>Idea Centre</strong> incubation entry.
          </p>

          <div style="background:var(--bg-subtle);padding:0.75rem;border-radius:var(--radius-md);margin-bottom:1rem;font-size:0.85rem;">
            <div><strong>Title:</strong> ${this.escapeHtml(post.title)}</div>
            <div><strong>Author:</strong> ${this.escapeHtml(post.author?.name || 'Member')}</div>
            <div><strong>Tags:</strong> ${(post.tags || []).map((t) => t.name).join(', ') || 'None'}</div>
          </div>

          <div class="form-group">
            <label class="form-label">Problem Statement Summary</label>
            <textarea id="export-modal-problem" rows="2">${this.escapeHtml(post.title)}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Proposed Solution Summary</label>
            <textarea id="export-modal-solution" rows="3">${this.escapeHtml(post.content.substring(0, 300))}</textarea>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" onclick="app.closeModal()">Cancel</button>
            <button class="btn-primary" style="background:var(--idea-color);" onclick="app.confirmExportToIdea('${post.id}')">
              Confirm & Export to Idea Centre
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async confirmExportToIdea(postId) {
    const prob = document.getElementById('export-modal-problem')?.value;
    const sol = document.getElementById('export-modal-solution')?.value;

    const res = await api.exportToIdeaCentre(postId, {
      problemStatement: prob,
      proposedSolution: sol
    });

    this.closeModal();

    if (res?.success) {
      this.showToast(`✓ Successfully exported to Idea Centre! Idea #${res.data.ideaId}`);
      if (this.currentView === 'detail') this.renderPostDetail(postId);
      else this.loadPosts();
    } else if (res?.error?.code === 'ALREADY_EXPORTED') {
      alert(`✓ Already available in Idea Centre (${res.error.details?.ideaId || ''})`);
    } else {
      alert(`Unable to export right now: ${res?.error?.message || 'Server error'}`);
    }
  }

  // ==========================================
  // ASK MENTOR FLOW
  // ==========================================
  openAskMentorModal(mentorId) {
    const mentor = this.mentors.find((m) => m.id === mentorId);
    this.navigateTo('new');
    setTimeout(() => {
      const typeSelect = document.getElementById('new-post-type');
      if (typeSelect) typeSelect.value = 'question';
      const titleInput = document.getElementById('new-post-title');
      if (titleInput && mentor) {
        titleInput.value = `[Guidance Request] Question for ${mentor.name} on `;
        titleInput.focus();
      }
      const tagsInput = document.getElementById('new-post-tags');
      if (tagsInput && mentor?.mentorExpertise) {
        tagsInput.value = mentor.mentorExpertise.slice(0, 2).join(', ');
      }
    }, 150);
  }

  // ==========================================
  // REPORT CONTENT MODAL
  // ==========================================
  openReportModal(targetType, targetId) {
    const modal = document.getElementById('global-modal-container');
    if (!modal) return;

    modal.innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target === this) app.closeModal();">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">🚩 Report Inappropriate Content</h3>
            <button class="btn-icon" onclick="app.closeModal()">✕</button>
          </div>

          <div class="form-group">
            <label class="form-label">Reason for reporting</label>
            <select id="report-reason-select">
              <option value="spam">Spam / Unsolicited Promotion</option>
              <option value="harassment">Harassment / Abusive Language</option>
              <option value="offensive_content">Offensive / Inappropriate Content</option>
              <option value="misleading_information">Misleading / Dangerous Code</option>
              <option value="other">Other Violation</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Additional Context</label>
            <textarea id="report-notes" rows="3" placeholder="Explain why this content violates community guidelines..."></textarea>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" onclick="app.closeModal()">Cancel</button>
            <button class="btn-primary" style="background:var(--danger-color);" onclick="app.submitReport('${targetType}', '${targetId}')">Submit Report</button>
          </div>
        </div>
      </div>
    `;
  }

  async submitReport(targetType, targetId) {
    const reason = document.getElementById('report-reason-select')?.value;
    const notes = document.getElementById('report-notes')?.value;

    const res = await api.createReport({ targetType, targetId, reason, notes });
    this.closeModal();

    if (res?.success) {
      this.showToast('Report submitted for moderator review.');
    }
  }

  async resolveReport(reportId, action) {
    const res = await api.resolveReport(reportId, action);
    if (res?.success) {
      this.showToast(`Report ${action === 'dismiss' ? 'dismissed' : 'resolved'}`);
      this.renderModerationQueue();
    }
  }

  closeModal() {
    const modal = document.getElementById('global-modal-container');
    if (modal) modal.innerHTML = '';
  }

  // ==========================================
  // FILTERS & NAVIGATION HELPERS
  // ==========================================
  setFeedFilter(filter) {
    this.feedFilter = filter;
    this.selectedCommunitySlug = null;
    this.activeTag = null;
    this.searchQuery = '';
    const search = document.getElementById('global-search');
    if (search) search.value = '';
    this.loadPosts();
  }

  filterByCommunity(slug) {
    this.selectedCommunitySlug = slug;
    this.feedFilter = 'all';
    this.activeTag = null;
    this.navigateTo('');
    this.loadPosts();
    this.renderSidebarWidgets();
  }

  filterByTag(slug) {
    this.activeTag = slug;
    this.feedFilter = 'all';
    this.selectedCommunitySlug = null;
    this.navigateTo('');
    this.loadPosts();
  }

  clearFilters() {
    this.selectedCommunitySlug = null;
    this.activeTag = null;
    this.searchQuery = '';
    this.feedFilter = 'all';
    const search = document.getElementById('global-search');
    if (search) search.value = '';
    this.loadPosts();
  }

  updateActiveNav() {
    document.querySelectorAll('.nav-item-btn').forEach((btn) => {
      btn.classList.remove('active');
    });

    if (this.currentView === 'feed' && !this.selectedCommunitySlug) {
      const el = document.getElementById('nav-feed-btn');
      if (el) el.classList.add('active');
    } else if (this.currentView === 'communities') {
      const el = document.getElementById('nav-communities-btn');
      if (el) el.classList.add('active');
    } else if (this.currentView === 'mentors') {
      const el = document.getElementById('nav-mentors-btn');
      if (el) el.classList.add('active');
    } else if (this.currentView === 'moderation') {
      const el = document.getElementById('nav-moderation-btn');
      if (el) el.classList.add('active');
    }
  }

  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-bubble';
    toast.style.cssText = `
      background-color: var(--text-main);
      color: var(--text-inverse);
      padding: 0.65rem 1.15rem;
      border-radius: var(--radius-md);
      font-size: 0.825rem;
      font-weight: 600;
      box-shadow: var(--shadow-lg);
      margin-top: 0.5rem;
      animation: modalEnter 0.2s ease;
    `;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  renderMarkdown(text) {
    if (!text) return '';
    // Basic safe markdown parser
    let html = this.escapeHtml(text);
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    // Code blocks & inline code
    html = html.replace(/`(.*?)`/gim, '<code style="background:var(--bg-subtle);padding:0.1rem 0.3rem;border-radius:3px;font-size:0.85em;">$1</code>');
    // Line breaks
    html = html.replace(/\n\n/gim, '</p><p>');
    html = html.replace(/\n/gim, '<br/>');
    return `<p>${html}</p>`;
  }
}

// Bootstrap Singleton
window.app = new ForumApp();
