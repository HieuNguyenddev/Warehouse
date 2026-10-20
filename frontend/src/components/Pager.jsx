import Icon from "./Icon.jsx";

export const PAGE_SIZE = 8;

export function slicePage(items, page) {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(Math.max(page, 1), pageCount);
  const start = (current - 1) * PAGE_SIZE;
  return {
    current,
    pageCount,
    total,
    start,
    items: items.slice(start, start + PAGE_SIZE),
  };
}

function pageNumbers(current, pageCount) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const numbers = new Set([1, pageCount, current - 1, current, current + 1]);
  return [...numbers].filter((number) => number >= 1 && number <= pageCount).sort((left, right) => left - right);
}

export default function Pager({ page, pageCount, total, start, onPage }) {
  if (total === 0) {
    return null;
  }

  const from = start + 1;
  const to = Math.min(start + PAGE_SIZE, total);
  const numbers = pageNumbers(page, pageCount);

  return (
    <nav className="pager" aria-label="Phân trang">
      <span>
        {from}–{to} của {total}
      </span>
      <div className="pager-controls">
        <button type="button" className="ghost compact" onClick={() => onPage(page - 1)} disabled={page <= 1}>
          <Icon name="fa-chevron-left" />
          Trước
        </button>
        {numbers.map((number, index) => {
          const previous = numbers[index - 1];
          const gap = previous != null && number - previous > 1;
          return (
            <span key={number} className="pager-slot">
              {gap ? <span className="pager-gap">…</span> : null}
              <button
                type="button"
                className={number === page ? "pager-page is-current" : "pager-page"}
                onClick={() => onPage(number)}
                aria-current={number === page ? "page" : undefined}
              >
                {number}
              </button>
            </span>
          );
        })}
        <button type="button" className="ghost compact" onClick={() => onPage(page + 1)} disabled={page >= pageCount}>
          Sau
          <Icon name="fa-chevron-right" />
        </button>
      </div>
    </nav>
  );
}
