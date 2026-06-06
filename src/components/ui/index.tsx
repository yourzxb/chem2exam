"use client";

import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  ReactNode,
  TdHTMLAttributes,
} from "react";

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

type Tone = "neutral" | "teal" | "orange" | "green" | "blue" | "red" | "violet" | "gold";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "reward";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

export function Button({
  children,
  className,
  disabled,
  fullWidth = false,
  leadingIcon,
  loading = false,
  size = "md",
  trailingIcon,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      aria-busy={loading || props["aria-busy"]}
      className={cn(
        "ui-button",
        `ui-button-${variant}`,
        `ui-button-${size}`,
        fullWidth && "ui-button-full",
        loading && "ui-button-loading",
        className,
      )}
      disabled={disabled || loading}
      type={type}
    >
      {loading ? <span aria-hidden="true" className="ui-button-loading-dot" /> : leadingIcon}
      <span className="ui-button-label">{children}</span>
      {trailingIcon}
    </button>
  );
}

export type CardProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  variant?: "plain" | "soft" | "highlight" | "reward";
  interactive?: boolean;
};

export function Card({
  actions,
  children,
  className,
  description,
  eyebrow,
  interactive = false,
  title,
  variant = "plain",
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        "ui-card",
        `ui-card-${variant}`,
        interactive && "ui-card-interactive",
        className,
      )}
    >
      {(eyebrow || title || description || actions) && (
        <div className="ui-card-header">
          <div>
            {eyebrow && <p className="ui-card-eyebrow">{eyebrow}</p>}
            {title && <h2 className="ui-card-title">{title}</h2>}
            {description && <p className="ui-card-description">{description}</p>}
          </div>
          {actions && <div className="ui-card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export type StatCardProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  label: ReactNode;
  value: ReactNode;
  helper?: ReactNode;
  icon?: ReactNode;
  trend?: ReactNode;
  tone?: Tone;
};

export function StatCard({
  className,
  helper,
  icon,
  label,
  tone = "teal",
  trend,
  value,
  ...props
}: StatCardProps) {
  return (
    <div {...props} className={cn("ui-stat-card", `ui-tone-${tone}`, className)}>
      <div className="ui-stat-card-top">
        <span className="ui-stat-card-label">{label}</span>
        {icon && <span className="ui-stat-card-icon">{icon}</span>}
      </div>
      <strong className="ui-stat-card-value">{value}</strong>
      {(helper || trend) && (
        <div className="ui-stat-card-bottom">
          {helper && <span>{helper}</span>}
          {trend && <strong>{trend}</strong>}
        </div>
      )}
    </div>
  );
}

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  size?: "sm" | "md";
  pill?: boolean;
};

export function Badge({
  children,
  className,
  pill = true,
  size = "md",
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      className={cn("ui-badge", `ui-badge-${tone}`, `ui-badge-${size}`, pill && "ui-badge-pill", className)}
    >
      {children}
    </span>
  );
}

export type TabItem = {
  id: string;
  label: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
};

export type TabsProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
};

export function Tabs({ ariaLabel, className, items, onChange, value, ...props }: TabsProps) {
  return (
    <div {...props} aria-label={ariaLabel} className={cn("ui-tabs", className)} role="tablist">
      {items.map((item) => (
        <button
          aria-selected={item.id === value}
          className={cn("ui-tab", item.id === value && "ui-tab-active")}
          disabled={item.disabled}
          key={item.id}
          onClick={() => onChange(item.id)}
          role="tab"
          type="button"
        >
          <span>{item.label}</span>
          {item.badge && <span className="ui-tab-badge">{item.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export type ToolbarProps = HTMLAttributes<HTMLDivElement> & {
  align?: "start" | "between" | "end";
};

export function Toolbar({ align = "between", children, className, ...props }: ToolbarProps) {
  return (
    <div {...props} className={cn("ui-toolbar", `ui-toolbar-${align}`, className)}>
      {children}
    </div>
  );
}

export type DataTableColumn<TData extends object> = {
  key: keyof TData | string;
  header: ReactNode;
  render?: (row: TData, index: number) => ReactNode;
  align?: TdHTMLAttributes<HTMLTableCellElement>["align"];
  className?: string;
};

export type DataTableProps<TData extends object> = HTMLAttributes<HTMLDivElement> & {
  columns: Array<DataTableColumn<TData>>;
  data: TData[];
  caption?: string;
  emptyState?: ReactNode;
  getRowKey?: (row: TData, index: number) => string | number;
};

export function DataTable<TData extends object>({
  caption,
  className,
  columns,
  data,
  emptyState,
  getRowKey,
  ...props
}: DataTableProps<TData>) {
  return (
    <div {...props} className={cn("ui-data-table-shell", className)}>
      {data.length === 0 ? (
        emptyState ?? <EmptyState title="暂无数据" description="当前筛选条件下还没有可展示的内容。" />
      ) : (
        <table className="ui-data-table">
          {caption && <caption>{caption}</caption>}
          <thead>
            <tr>
              {columns.map((column) => (
                <th align={column.align} className={column.className} key={String(column.key)} scope="col">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={getRowKey ? getRowKey(row, rowIndex) : rowIndex}>
                {columns.map((column) => {
                  const value = (row as Record<string, unknown>)[String(column.key)];

                  return (
                    <td align={column.align} className={column.className} key={String(column.key)}>
                      {column.render ? column.render(row, rowIndex) : String(value ?? "")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export type EmptyStateProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  visual?: ReactNode;
};

export function EmptyState({ action, className, description, title, visual, ...props }: EmptyStateProps) {
  return (
    <div {...props} className={cn("ui-empty-state", className)}>
      {visual ?? <span aria-hidden="true" className="ui-empty-state-visual" />}
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action && <div className="ui-empty-state-action">{action}</div>}
    </div>
  );
}

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "text" | "block" | "card" | "circle";
  lines?: number;
};

export function Skeleton({ className, lines = 1, variant = "block", ...props }: SkeletonProps) {
  if (variant === "text" && lines > 1) {
    return (
      <div {...props} className={cn("ui-skeleton-stack", className)}>
        {Array.from({ length: lines }, (_, index) => (
          <div
            aria-hidden="true"
            className={cn("ui-skeleton", "ui-skeleton-text", index === lines - 1 && "ui-skeleton-short")}
            key={index}
          />
        ))}
      </div>
    );
  }

  return <div {...props} aria-hidden="true" className={cn("ui-skeleton", `ui-skeleton-${variant}`, className)} />;
}

export type NoticeProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "info" | "success" | "warning" | "error" | "working";
  title?: ReactNode;
  action?: ReactNode;
};

export function Notice({ action, children, className, title, tone = "info", ...props }: NoticeProps) {
  return (
    <div {...props} className={cn("ui-notice", `ui-notice-${tone}`, className)} role={tone === "error" ? "alert" : "status"}>
      <span aria-hidden="true" className="ui-notice-mark" />
      <div className="ui-notice-body">
        {title && <strong>{title}</strong>}
        {children && <div>{children}</div>}
      </div>
      {action && <div className="ui-notice-action">{action}</div>}
    </div>
  );
}

export type ProgressRingProps = HTMLAttributes<HTMLDivElement> & {
  value: number;
  max?: number;
  label?: ReactNode;
  size?: number;
  thickness?: number;
  tone?: Tone;
};

export function ProgressRing({
  className,
  label,
  max = 100,
  size = 88,
  thickness = 10,
  tone = "teal",
  value,
  ...props
}: ProgressRingProps) {
  const percentage = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  const style = {
    "--ui-progress-size": `${size}px`,
    "--ui-progress-thickness": `${thickness}px`,
    "--ui-progress-value": `${percentage}%`,
  } as CSSProperties;

  return (
    <div
      {...props}
      aria-label={typeof label === "string" ? label : `进度 ${percentage}%`}
      aria-valuemax={max}
      aria-valuemin={0}
      aria-valuenow={value}
      className={cn("ui-progress-ring", `ui-tone-${tone}`, className)}
      role="progressbar"
      style={{ ...style, ...props.style }}
    >
      <span>{label ?? `${percentage}%`}</span>
    </div>
  );
}
