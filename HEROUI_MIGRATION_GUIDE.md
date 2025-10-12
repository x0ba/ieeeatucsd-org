# HeroUI Migration Quick Reference Guide

## Component Mapping: shadcn/ui → HeroUI

### Cards
```tsx
// Before (shadcn/ui)
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <h2>Title</h2>
  <p>Content</p>
</div>

// After (HeroUI)
import { Card, CardHeader, CardBody, CardFooter } from '@heroui/react';

<Card shadow="sm">
  <CardHeader>
    <h2>Title</h2>
  </CardHeader>
  <CardBody>
    <p>Content</p>
  </CardBody>
</Card>
```

### Buttons
```tsx
// Before (shadcn/ui)
import { Button } from '@/components/ui/button';

<Button variant="default">Click me</Button>

// After (HeroUI)
import { Button } from '@heroui/react';

<Button color="primary" variant="solid">Click me</Button>
```

### Avatars/Icons
```tsx
// Before (Custom div)
<div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
  <Icon className="w-6 h-6 text-blue-600" />
</div>

// After (HeroUI)
import { Avatar } from '@heroui/react';

<Avatar
  icon={<Icon className="w-6 h-6" />}
  className="bg-blue-100 text-blue-600"
  size="lg"
/>
```

### Badges/Tags
```tsx
// Before (Custom span)
<span className="text-xs text-green-600 font-medium">+10 pts</span>

// After (HeroUI)
import { Chip } from '@heroui/react';

<Chip color="success" variant="flat" size="sm">
  +10 pts
</Chip>
```

### Skeletons
```tsx
// Before (Custom component)
import { MetricCardSkeleton } from '@/components/ui/loading';

<MetricCardSkeleton />

// After (HeroUI)
import { Skeleton } from '@heroui/react';

<Skeleton className="w-24 h-4 rounded-lg" />
```

## HeroUI Component Props Reference

### Card
```tsx
<Card
  shadow="none" | "sm" | "md" | "lg"
  radius="none" | "sm" | "md" | "lg"
  fullWidth={boolean}
  isHoverable={boolean}
  isPressable={boolean}
  isBlurred={boolean}
  isDisabled={boolean}
  className={string}
>
  <CardHeader className={string}>...</CardHeader>
  <CardBody className={string}>...</CardBody>
  <CardFooter className={string}>...</CardFooter>
</Card>
```

### Button
```tsx
<Button
  color="default" | "primary" | "secondary" | "success" | "warning" | "danger"
  variant="solid" | "bordered" | "light" | "flat" | "faded" | "shadow" | "ghost"
  size="sm" | "md" | "lg"
  radius="none" | "sm" | "md" | "lg" | "full"
  isDisabled={boolean}
  isLoading={boolean}
  isIconOnly={boolean}
  fullWidth={boolean}
  startContent={ReactNode}
  endContent={ReactNode}
  as="a" | "button" | Component
  href={string}
  onPress={() => void}
>
  Button Text
</Button>
```

### Avatar
```tsx
<Avatar
  src={string}
  icon={ReactNode}
  name={string}
  size="sm" | "md" | "lg"
  color="default" | "primary" | "secondary" | "success" | "warning" | "danger"
  radius="none" | "sm" | "md" | "lg" | "full"
  isBordered={boolean}
  isDisabled={boolean}
  className={string}
/>
```

### Chip
```tsx
<Chip
  color="default" | "primary" | "secondary" | "success" | "warning" | "danger"
  variant="solid" | "bordered" | "light" | "flat" | "faded" | "shadow" | "dot"
  size="sm" | "md" | "lg"
  radius="none" | "sm" | "md" | "lg" | "full"
  startContent={ReactNode}
  endContent={ReactNode}
  avatar={string}
  onClose={() => void}
  isDisabled={boolean}
  className={string}
>
  Chip Text
</Chip>
```

### Skeleton
```tsx
<Skeleton
  className={string}
  isLoaded={boolean}
  disableAnimation={boolean}
>
  <div>Content to show when loaded</div>
</Skeleton>
```

## Common Patterns

### Interactive Card
```tsx
<Card 
  isPressable 
  isHoverable 
  className="hover:shadow-md transition-shadow"
  shadow="sm"
>
  <CardBody>
    {/* Content */}
  </CardBody>
</Card>
```

### Card as Link
```tsx
<Card 
  as="a" 
  href="/path" 
  isPressable 
  isHoverable
>
  <CardBody>
    {/* Content */}
  </CardBody>
</Card>
```

### Loading State
```tsx
{loading ? (
  <Card shadow="sm">
    <CardBody className="p-6">
      <div className="space-y-3">
        <Skeleton className="w-3/4 h-4 rounded-lg" />
        <Skeleton className="w-1/2 h-3 rounded-lg" />
      </div>
    </CardBody>
  </Card>
) : (
  <Card shadow="sm">
    <CardBody className="p-6">
      {/* Actual content */}
    </CardBody>
  </Card>
)}
```

### Empty State
```tsx
<div className="text-center py-12">
  <Avatar
    icon={<Icon className="w-8 h-8" />}
    className="bg-gray-100 text-gray-400 mx-auto mb-4"
    size="lg"
  />
  <p className="text-base text-gray-500">No items found</p>
</div>
```

### Stat Card
```tsx
<Card className="w-full hover:shadow-md transition-shadow" shadow="sm" isPressable>
  <CardBody className="p-6">
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-600 mb-1">Label</p>
        <p className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
          {value}
        </p>
      </div>
      <Avatar
        icon={<Icon className="w-6 h-6" />}
        className="bg-blue-100 text-blue-600"
        size="lg"
      />
    </div>
  </CardBody>
</Card>
```

## Color System

### HeroUI Colors
- `default` - Gray/neutral
- `primary` - Blue (main brand color)
- `secondary` - Purple
- `success` - Green
- `warning` - Yellow/Orange
- `danger` - Red

### Custom Colors (Tailwind)
You can still use Tailwind classes for custom colors:
```tsx
<Avatar className="bg-yellow-100 text-yellow-600" />
<Chip className="bg-gradient-to-r from-blue-500 to-purple-500" />
```

## Size System

### Consistent Sizing
- `sm` - Small
- `md` - Medium (default)
- `lg` - Large

### Responsive Sizing
```tsx
// Use Tailwind for responsive text
<p className="text-sm md:text-base lg:text-lg">Text</p>

// HeroUI components use fixed sizes, wrap in responsive containers
<div className="w-full md:w-1/2 lg:w-1/3">
  <Card>...</Card>
</div>
```

## Best Practices

### 1. Use Semantic Structure
```tsx
// Good
<Card>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
  <CardFooter>Actions</CardFooter>
</Card>

// Avoid
<Card>
  <div>Title</div>
  <div>Content</div>
  <div>Actions</div>
</Card>
```

### 2. Consistent Spacing
```tsx
// Use gap instead of space-x/space-y
<div className="flex gap-4">  // Good
<div className="flex space-x-4">  // Avoid with HeroUI
```

### 3. Interactive Feedback
```tsx
// Always add interactive props for clickable cards
<Card isPressable isHoverable>  // Good
<Card onClick={...}>  // Missing visual feedback
```

### 4. Loading States
```tsx
// Match the structure of loaded content
{loading ? (
  <Card>
    <CardBody>
      <Skeleton className="w-full h-20" />
    </CardBody>
  </Card>
) : (
  <Card>
    <CardBody>
      <Content />
    </CardBody>
  </Card>
)}
```

### 5. Accessibility
```tsx
// HeroUI handles most accessibility automatically
<Button>Click me</Button>  // Has proper ARIA attributes

// For custom content, add ARIA labels
<Avatar icon={<Icon />} aria-label="User profile" />
```

## Migration Checklist

- [ ] Replace custom card divs with `Card` components
- [ ] Use `CardHeader`, `CardBody`, `CardFooter` for structure
- [ ] Replace icon containers with `Avatar` components
- [ ] Replace badge/tag text with `Chip` components
- [ ] Replace custom buttons with `Button` components
- [ ] Replace custom skeletons with `Skeleton` components
- [ ] Add `isPressable` and `isHoverable` to interactive cards
- [ ] Use `shadow` prop instead of Tailwind shadow classes
- [ ] Test responsive behavior on mobile, tablet, desktop
- [ ] Verify loading states match content structure
- [ ] Check empty states have proper visual hierarchy
- [ ] Ensure all interactive elements have proper feedback

## Common Issues & Solutions

### Issue: Card not clickable
```tsx
// Solution: Add isPressable
<Card isPressable>...</Card>
```

### Issue: No hover effect
```tsx
// Solution: Add isHoverable and transition
<Card isHoverable className="hover:shadow-md transition-shadow">...</Card>
```

### Issue: Avatar not showing icon
```tsx
// Solution: Ensure icon is wrapped in component
<Avatar icon={<Icon className="w-6 h-6" />} />  // Good
<Avatar icon="icon-name" />  // Won't work
```

### Issue: Chip color not working
```tsx
// Solution: Use HeroUI color names
<Chip color="success">...</Chip>  // Good
<Chip color="green">...</Chip>  // Won't work
```

### Issue: Skeleton not matching content
```tsx
// Solution: Match the structure exactly
<Skeleton className="w-24 h-4 rounded-lg" />  // Matches text
<Skeleton className="w-12 h-12 rounded-full" />  // Matches avatar
```

