import React from 'react';

export const Icon = ({ name, className = '', ...rest }) => (
  <span className={`material-symbols-outlined ${className}`} {...rest}>{name}</span>
);

export const Spinner = ({ className = '' }) => (
  <Icon name="progress_activity" className={`animate-spin inline-block ${className}`} />
);

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  className = '',
  type = 'button',
  ...rest
}) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150 gap-2 leading-none whitespace-nowrap select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3.5 py-2 text-[13px]',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  const iconSizes = { xs: 'text-[14px]', sm: 'text-base', md: 'text-[18px]', lg: 'text-[20px]' };
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
    tertiary: 'bg-tertiary text-tertiary-foreground hover:bg-tertiary-hover',
    danger: 'bg-error text-error-foreground hover:bg-error/85',
    success: 'bg-success text-success-foreground hover:bg-success/85',
    outline: 'bg-transparent text-muted-foreground border border-input hover:bg-muted hover:text-primary hover:border-primary',
    outlinePrimary: 'bg-transparent text-primary border border-primary hover:bg-primary-container',
    ghost: 'bg-transparent text-muted-foreground hover:bg-muted hover:text-primary',
  };
  return (
    <button
      type={type}
      className={`${base} ${sizes[size]} ${variants[variant]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {typeof children === 'string' ? (
        <span>{children}</span>
      ) : (
        React.Children.map(children, (child) => {
          if (child?.type === Icon) {
            return React.cloneElement(child, {
              className: `${iconSizes[size]} ${child.props.className || ''}`,
            });
          }
          return child;
        })
      )}
    </button>
  );
};

export const Input = ({ icon, suffix, className = '', ...rest }) => (
  <div className="relative">
    {icon && (
      <Icon
        name={icon}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px] pointer-events-none"
      />
    )}
    <input
      className={`w-full ${icon ? 'pl-10' : 'pl-3.5'} ${suffix ? 'pr-10' : 'pr-3.5'} py-2.5 border border-input rounded-md text-sm bg-card text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-muted disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
      {...rest}
    />
    {suffix}
  </div>
);

export const Select = ({ options = [], placeholder, className = '', ...rest }) => (
  <select
    className={`w-full px-3.5 py-2.5 border border-input rounded-md text-sm bg-card text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${className}`}
    {...rest}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((o) => {
      const value = typeof o === 'string' ? o : o.value;
      const label = typeof o === 'string' ? o : o.label;
      return <option key={value} value={value}>{label}</option>;
    })}
  </select>
);

export const Textarea = ({ className = '', ...rest }) => (
  <textarea
    className={`w-full px-3.5 py-2.5 border border-input rounded-md text-sm bg-card text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-y ${className}`}
    {...rest}
  />
);

export const FormGroup = ({ label, children, hint, error }) => (
  <div className="mb-5">
    {label && (
      <label className="block text-[13px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </label>
    )}
    {children}
    {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
    {!error && hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

export const Card = ({ children, className = '', padded = true }) => (
  <div className={`bg-card border border-border rounded-xl shadow-sm ${padded ? 'p-6' : ''} ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, actions }) => (
  <div className="flex items-center justify-between flex-wrap gap-3 mb-5 pb-4 border-b border-border">
    <div>
      <h3 className="text-lg font-semibold text-foreground m-0">{title}</h3>
      {subtitle && <p className="text-sm text-muted-foreground m-0 mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export const Badge = ({ variant = 'inactive', children, dot = true }) => {
  const variants = {
    pending: 'bg-warning-container text-warning-on-container border-warning/20',
    active: 'bg-success-container text-success-on-container border-success/20',
    completed: 'bg-primary-container text-primary-on-container border-primary/20',
    danger: 'bg-error-container text-error-on-container border-error/20',
    inactive: 'bg-muted text-muted-foreground border-border',
    info: 'bg-secondary-container text-secondary-on-container border-secondary/20',
    warning: 'bg-tertiary-container text-tertiary-on-container border-tertiary/20',
  };
  const dotColors = {
    pending: 'bg-warning',
    active: 'bg-success',
    completed: 'bg-primary',
    danger: 'bg-error',
    inactive: 'bg-muted-foreground',
    info: 'bg-secondary',
    warning: 'bg-tertiary',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${variants[variant]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

export const StatCard = ({ icon, value, label, iconClassName = 'bg-primary-container text-primary' }) => (
  <div className="bg-card border border-border rounded-xl p-5 transition-all duration-300 shadow-sm hover:-translate-y-0.5 hover:shadow-md">
    <div className={`w-11 h-11 rounded-md flex items-center justify-center mb-4 ${iconClassName}`}>
      <Icon name={icon} className="text-[22px]" />
    </div>
    <div className="text-3xl font-bold text-primary mb-1 break-words leading-tight">{value}</div>
    <div className="text-[13px] text-muted-foreground font-medium">{label}</div>
  </div>
);

export const StatGrid = ({ className = '', children }) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8 ${className}`}>
    {children}
  </div>
);

export const PageHeader = ({ title, subtitle, icon, actions }) => (
  <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
    <div className="flex items-start gap-3 flex-1 min-w-0">
      {icon && (
        <Icon
          name={icon}
          className="text-[32px] text-primary flex-shrink-0"
        />
      )}
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold text-primary leading-tight m-0 tracking-tight break-words">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[15px] text-muted-foreground mt-2 m-0">{subtitle}</p>
        )}
      </div>
    </div>
    {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
  </div>
);

export const TableCard = ({ toolbar, children, footer }) => (
  <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
    {toolbar && (
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 border-b border-border">
        {toolbar}
      </div>
    )}
    <div className="overflow-x-auto">{children}</div>
    {footer && (
      <div className="flex items-center gap-4 flex-wrap p-3.5 border-t border-border">
        {footer}
      </div>
    )}
  </div>
);

export const Modal = ({ open, onClose, children, size = 'md' }) => {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-3xl' };
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-up"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-card rounded-2xl w-full p-8 shadow-2xl border border-border ${widths[size]}`}
      >
        {children}
      </div>
    </div>
  );
};

export const ModalHeader = ({ icon, iconVariant = 'info', title, subtitle }) => {
  const variants = {
    info: 'bg-primary-container text-primary',
    danger: 'bg-error-container text-error',
    success: 'bg-success-container text-success',
  };
  return (
    <div className="flex items-start gap-4 mb-6">
      {icon && (
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${variants[iconVariant]}`}>
          <Icon name={icon} className="text-[24px]" />
        </div>
      )}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground m-0">{subtitle}</p>}
      </div>
    </div>
  );
};

export const ModalActions = ({ children }) => (
  <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-border flex-wrap">
    {children}
  </div>
);

export const Tabs = ({ tabs, active, onChange }) => (
  <div className="flex border-b-2 border-border mb-6 gap-1 overflow-x-auto">
    {tabs.map((t) => (
      <button
        key={t.value}
        onClick={() => onChange(t.value)}
        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors -mb-0.5 border-b-2 ${
          active === t.value
            ? 'text-primary font-semibold border-primary'
            : 'text-muted-foreground border-transparent hover:text-primary hover:bg-muted rounded-t'
        }`}
      >
        {t.icon && <Icon name={t.icon} className="text-[18px]" />}
        {t.label}
      </button>
    ))}
  </div>
);

export const EmptyState = ({ icon = 'info', title, message, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-4">
    <div className="w-16 h-16 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mb-4">
      <Icon name={icon} className="text-[32px]" />
    </div>
    <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
    {message && <p className="text-sm text-muted-foreground max-w-md m-0">{message}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const FilterBar = ({ children }) => (
  <div className="flex flex-wrap gap-3 p-4 border-b border-border">{children}</div>
);

export const FilterItem = ({ label, children }) => (
  <div className="flex items-center gap-2">
    {label && (
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        {label}
      </label>
    )}
    {children}
  </div>
);

export const DetailGrid = ({ children }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{children}</div>
);

export const DetailItem = ({ label, value, className = '' }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
    <span className="text-sm font-semibold text-foreground break-words">{value ?? '—'}</span>
  </div>
);

export const DetailSection = ({ title, children }) => (
  <div className="mb-6">
    <h4 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground m-0 mb-3 pb-2 border-b border-border">
      {title}
    </h4>
    {children}
  </div>
);

export const QuickActionCard = ({ icon, title, description, onClick, iconClassName = 'bg-primary-container text-primary' }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card text-left transition-all duration-200 hover:border-primary hover:-translate-y-0.5 hover:shadow-md w-full"
  >
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClassName}`}>
      <Icon name={icon} className="text-[22px]" />
    </div>
    <div className="min-w-0">
      <h4 className="text-[15px] font-semibold m-0 text-foreground">{title}</h4>
      <p className="text-[13px] text-muted-foreground m-0 mt-0.5">{description}</p>
    </div>
  </button>
);

export const SpinnerScreen = ({ label = 'Loading...' }) => (
  <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
    <Spinner className="text-[24px]" />
    <span className="text-sm">{label}</span>
  </div>
);

export const StatusDot = ({ color = 'bg-muted-foreground' }) => (
  <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
);
