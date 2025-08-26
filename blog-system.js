// blog-system.js
(function () {
  class BlogSystem {
    constructor() {
      this.posts = [];
      this.filtered = [];
      this.page = 1;
      this.perPage = 6;
      this.cache = new Map();

      this.$grid = document.getElementById('blog-grid');
      this.$empty = document.getElementById('blog-empty');
      this.$search = document.getElementById('blog-search');
      this.$prev = document.getElementById('prev-page');
      this.$next = document.getElementById('next-page');
      this.$pageInfo = document.querySelector('.page-info');
      this.$modal = document.getElementById('blog-modal');
      this.$modalTitle = document.getElementById('modal-title');
      this.$modalBody = document.getElementById('modal-body');
      this.$close = document.getElementById('close-modal');

      this.bind();
      this.load();
      this.bindDelegatedRead();
    }

    bind() {
      // Search with debounce
      if (this.$search) {
        let t;
        this.$search.addEventListener('input', () => {
          clearTimeout(t);
          t = setTimeout(() => this.search(), 200);
        });
      }

      // Pagination
      this.$prev && this.$prev.addEventListener('click', () => {
        if (this.page > 1) { this.page--; this.render(); }
      });
      this.$next && this.$next.addEventListener('click', () => {
        const total = Math.ceil(this.filtered.length / this.perPage);
        if (this.page < total) { this.page++; this.render(); }
      });

      // Modal close controls
      this.$close && this.$close.addEventListener('click', () => this.hideModal());
      this.$modal && this.$modal.addEventListener('click', (e) => {
        if (e.target === this.$modal) this.hideModal();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.hideModal();
      });
    }

    bindDelegatedRead() {
      if (!this.$grid || this.$grid.__readBound) return;
      this.$grid.addEventListener('click', (e) => {
        const opener = e.target.closest('[data-open]');
        if (!opener) return;
        const filename = opener.getAttribute('data-open');
        if (filename) this.open(filename);
      });
      this.$grid.__readBound = true;
    }

    async load() {
      const res = await fetch('./blog/posts.json');
      const data = await res.json();
      this.posts = (data.posts || [])
        .map(p => ({ ...p, _date: new Date(p.date) }))
        .sort((a, b) => b._date - a._date);
      this.filtered = [...this.posts];
      this.render();
    }

    async search() {
      const q = (this.$search.value || '').trim().toLowerCase();
      this.page = 1;
      if (!q) { this.filtered = [...this.posts]; this.render(); return; }

      const results = [];
      for (const p of this.posts) {
        const quick =
          (p.title || '').toLowerCase().includes(q) ||
          (p.excerpt || '').toLowerCase().includes(q) ||
          (Array.isArray(p.tags) && p.tags.some(t => (t || '').toLowerCase().includes(q)));

        if (quick) { results.push(p); continue; }

        const md = await this.getMarkdown(p.filename);
        const plain = this.stripMarkdown(md).toLowerCase();
        if (plain.includes(q)) results.push(p);
      }

      this.filtered = results;
      this.render();
    }

    async getMarkdown(filename) {
      if (this.cache.has(filename)) return this.cache.get(filename);
      const res = await fetch(`./blog/posts/${filename}`);
      const txt = await res.text();
      this.cache.set(filename, txt);
      return txt;
    }

    stripMarkdown(md) {
      return md
        // Remove frontmatter
        .replace(/^---[\s\S]*?---\n/, '')
        // Remove fenced code blocks ``````
        .replace(/``````/g, '')
        // Remove inline code
        .replace(/`[^`]+`/g, '')
        // Remove links but keep text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove images entirely
        .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
        // Remove headings
        .replace(/^#{1,6}\s+/gm, '')
        // Remove blockquotes
        .replace(/^>\s+/gm, '')
        // Remove list markers
        .replace(/^[-*+]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        // Collapse whitespace
        .replace(/\s+/g, ' ')
        .trim();
    }

    render() {
      const total = Math.max(1, Math.ceil(this.filtered.length / this.perPage));
      const start = (this.page - 1) * this.perPage;
      const slice = this.filtered.slice(start, start + this.perPage);

      if (!slice.length) {
        this.$grid.innerHTML = '';
        this.$empty.style.display = 'block';
      } else {
        this.$empty.style.display = 'none';
        this.$grid.innerHTML = slice.map(p => this.card(p)).join('');
      }

      if (this.$pageInfo) this.$pageInfo.textContent = `Page ${this.page} of ${total}`;
      if (this.$prev) this.$prev.disabled = this.page <= 1;
      if (this.$next) this.$next.disabled = this.page >= total;
    }

    card(p) {
  const date = p._date.toLocaleDateString('en-US', {year:'numeric', month:'long', day:'numeric'});
  const tags = Array.isArray(p.tags) ? p.tags.map(t=>`#${this.escape(t)}`).join(' ') : '';

  const imageDiv = p.image ? `
    <div class="image-div">
      <img src="${this.escape(p.image)}" alt="${this.escape(p.title)}" style="width:100%;height:100%; object-fit: cover; border-top-left-radius:30px;">
    </div>
  ` : `
    <div class="image-div">
      <div style="
        height:100%;
        border-top-left-radius:30px;
        background:linear-gradient(135deg, var(--color-light-blue), var(--color-light-purple));
        display:flex; align-items:center; justify-content:center;
        color:#fff; font-size:2.2rem;
      ">
        📝
      </div>
    </div>
  `;

  return `
    <div class="project-box">
      <div class="info-div">
        <img class="faviconforProject" src="./src/png/favicon.png" alt="" />
        <div class="ProjectHeading">${this.escape(p.title||'')}</div>
        <div class="ProjectDescription">${this.escape(p.excerpt||'')}</div>
        <div class="ProjectDescription" style="color:var(--color-ddd-color);font-size:1.4rem;">
          ${this.escape(date)} ${tags ? `• ${this.escape(tags)}` : ''}
        </div>
        <div class="project-buttons">
          <button class="cta" data-open="${this.escape(p.filename)}">
            <span>Read</span>
            <svg viewBox="0 0 13 10" height="10" width="15"><path d="M1,5 L11,5 M8,1 L12,5 L8,9"></path></svg>
          </button>
        </div>
      </div>
      ${imageDiv}
    </div>
  `;
}

async open(filename) {
  const post = this.posts.find(p => p.filename === filename);
  let md = await this.getMarkdown(filename);

  // Remove frontmatter
  // Remove full YAML frontmatter block including any leading or trailing line breaks
  md = md.replace(/^---\s*[\s\S]*?---\s*/, '');

  // Remove the first level 1 heading line (# Title) including trailing newline(s)
  md = md.replace(/^# .*\n*/, '');


  // Remove title heading (e.g. # Title)
  md = md.replace(/^# .*\n/, '');

  const imageHtml = post && post.image ? `<img src="${this.escape(post.image)}" alt="${this.escape(post.title)}" />` : '';

  // Create tags & date line below image
  const tagsLine = post && post.tags ? `
    <div class="post-meta">
      <span class="post-date">${this.escape(post.date)}</span>
      <span class="post-tags">${post.tags.map(t => `#${this.escape(t)}`).join(' ')}</span>
    </div>
  ` : '';

  this.$modalTitle.textContent = post ? post.title : this.titleFromFilename(filename);

  this.$modalBody.innerHTML = `
    <article class="blog-post-content">
      ${imageHtml}
      ${tagsLine}
      ${this.toHTML(md)}
    </article>
  `;
  this.$modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

    hideModal() {
      this.$modal.style.display = 'none';
      document.body.style.overflow = '';
    }

    titleFromFrontMatter(md) {
      const m = md.match(/title:\s*(.+)/i);
      return m ? m[1].trim().replace(/^"|"$/g, '') : '';
    }

    titleFromFilename(fn) {
      return fn.replace(/[-_]/g, ' ').replace(/\.md$/,'');
    }

    toHTML(md) {
      return md
        .replace(/^###### (.*)$/gim, '<h6>$1</h6>')
        .replace(/^##### (.*)$/gim, '<h5>$1</h5>')
        .replace(/^#### (.*)$/gim, '<h4>$1</h4>')
        .replace(/^### (.*)$/gim, '<h3>$1</h3>')
        .replace(/^## (.*)$/gim, '<h2>$1</h2>')
        .replace(/^# (.*)$/gim, '<h1>$1</h1>')
        // Fenced code blocks
        .replace(/``````/gim, (m, code) => `<pre><code>${this.escape(code.trim())}</code></pre>`)
        // Inline code
        .replace(/`([^`]+)`/gim, '<code>$1</code>')
        // Emphasis
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        // Images
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" style="max-width:100%;border-radius:10px;margin:12px 0;display:block;">')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener" style="color:var(--color-light-blue);text-decoration:underline;">$1</a>')
        // Blockquotes
        .replace(/^> (.*)$/gim, '<blockquote style="border-left:4px solid var(--color-light-blue);padding-left:16px;margin:12px 0;">$1</blockquote>')
        // Paragraphs
        .replace(/\n{2,}/g, '<br><br>')
        .replace(/\n/g, '<br>')
    }

    escape(s) {
      return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('blog-grid')) new BlogSystem();
  });
})();
