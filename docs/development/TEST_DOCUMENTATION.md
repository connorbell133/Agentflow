# Test Suite Documentation

This document provides a comprehensive overview of all tests in the chat platform codebase, organized by category.

## Table of Contents
- [Component Tests](#component-tests)
  - [Chat Components](#chat-components)
  - [Admin Components](#admin-components)
  - [UI Components](#ui-components)
- [Hook Tests](#hook-tests)
- [Action Tests](#action-tests)
- [Utility Tests](#utility-tests)

---

## Component Tests

### Chat Components

#### ChatBox Component Tests
**Test File**: `src/components/features/chat/messaging/ChatBox/ChatBox.test.tsx`  
**Testing**: `src/components/features/chat/messaging/ChatBox/ChatBox.tsx`

| Test Name | Description |
|-----------|-------------|
| should render message input | Verifies that the message input textarea is rendered |
| should render send button | Ensures the send button is present in the component |
| should update input value when typing | Tests that input value updates as user types |
| should clear input after sending | Verifies input is cleared after message submission |
| should disable send button when input is empty | Tests send button is disabled with empty input |
| should enable send button when input has text | Verifies send button enables with text input |
| should call onSend with trimmed message | Tests that onSend is called with trimmed message content |
| should not call onSend with only whitespace | Ensures messages with only whitespace aren't sent |
| should handle Enter key to send (without shift) | Tests Enter key submits the message |
| should handle Shift+Enter for new line | Verifies Shift+Enter creates new line instead of sending |
| should handle Cmd/Ctrl+Enter to send | Tests keyboard shortcut for sending messages |
| should show placeholder text | Verifies placeholder text is displayed |
| should focus input on mount | Tests that input receives focus when component mounts |
| should handle very long messages | Tests handling of messages exceeding typical length |
| should preserve whitespace in messages | Ensures whitespace formatting is maintained |
| should handle rapid message sending | Tests behavior with quick successive sends |
| should maintain focus after sending | Verifies input retains focus after message submission |
| should handle paste events | Tests clipboard paste functionality |
| should resize textarea with content | Verifies textarea auto-resizes with content |
| should have proper ARIA labels | Tests accessibility attributes |
| should announce message sent to screen readers | Verifies screen reader announcements |
| should handle disabled state | Tests component behavior when disabled |
| should apply custom className | Verifies custom CSS classes are applied |
| should handle input with emojis | Tests emoji support in messages |
| should prevent XSS in input | Security test for XSS prevention |

#### ModelDropdown Component Tests
**Test File**: `src/components/features/chat/messaging/ModelDropdown/ModelDropdown.test.tsx`  
**Testing**: `src/components/features/chat/messaging/ModelDropdown/ModelDropdown.tsx`

| Test Name | Description |
|-----------|-------------|
| renders with provided models | Verifies dropdown renders with model list |
| shows correct selected model | Tests display of currently selected model |
| opens dropdown when clicked | Verifies dropdown opens on click |
| displays all model options when open | Tests all models are shown in dropdown |
| closes dropdown when clicking outside | Verifies click-outside behavior |
| closes dropdown when selecting a model | Tests dropdown closes after selection |
| calls onModelChange when selecting a different model | Verifies callback execution on model change |
| does not call onModelChange when selecting same model | Tests no callback for same model selection |
| renders with single model | Tests behavior with only one model option |
| disables dropdown when only one model available | Verifies dropdown is disabled for single model |
| handles empty models array | Tests graceful handling of no models |
| shows "No models available" when models array is empty | Verifies empty state message |
| filters models based on search input | Tests search functionality |
| shows "No results found" when search has no matches | Verifies no results message |
| clears search when dropdown closes | Tests search reset on close |
| highlights search matches | Verifies search term highlighting |
| maintains focus on search input when opened | Tests focus management |
| handles keyboard navigation with arrow keys | Verifies keyboard navigation |
| selects model with Enter key | Tests Enter key selection |
| closes dropdown with Escape key | Verifies Escape key behavior |
| announces selection changes to screen readers | Tests accessibility announcements |
| has proper ARIA attributes for dropdown | Verifies accessibility attributes |
| has proper ARIA attributes for options | Tests option accessibility |
| applies custom className | Verifies custom styling support |
| renders model icons when provided | Tests icon rendering |
| shows model descriptions in tooltip | Verifies tooltip functionality |
| handles very long model names | Tests text overflow handling |
| maintains selection when models list updates | Verifies selection persistence |
| scrolls to selected item when opening | Tests auto-scroll behavior |
| supports keyboard search (type-ahead) | Verifies type-ahead search |

### Admin Components

#### UserTable Component Tests
**Test File**: `src/components/features/admin/management/UserTable/__tests__/UserTable.test.tsx`  
**Testing**: `src/components/features/admin/management/UserTable/UserTable.tsx`

| Test Name | Description |
|-----------|-------------|
| renders users table when users exist | Verifies table renders with user data |
| renders correct column headers | Tests all column headers are present |
| displays user information correctly | Verifies user data is displayed properly |
| renders invites section when invites exist | Tests invite section rendering |
| shows edit user dialog when edit button clicked | Verifies edit dialog opens |
| updates user role when confirmed | Tests role update functionality |
| cancels edit when cancel clicked | Verifies cancel behavior |
| shows delete user dialog when delete button clicked | Tests delete dialog opens |
| deletes user when confirmed | Verifies user deletion |
| shows invite user dialog when invite button clicked | Tests invite dialog functionality |
| creates new invite when form submitted | Verifies invite creation |
| validates email format in invite form | Tests email validation |
| disables invite for existing emails | Verifies duplicate email prevention |
| shows resend invite dialog | Tests resend functionality |
| resends invite when confirmed | Verifies invite resend |
| shows revoke invite dialog | Tests revoke dialog |
| revokes invite when confirmed | Verifies invite revocation |
| shows empty state when no users | Tests empty state rendering |
| shows loading state initially | Verifies loading indicator |
| filters users by search term | Tests search functionality |
| sorts users by name | Verifies name sorting |
| sorts users by email | Tests email sorting |
| paginates users list | Verifies pagination |
| handles API errors gracefully | Tests error handling |
| refreshes data on user change | Verifies data refresh |

#### AdminTabs Component Tests
**Test File**: `src/components/features/admin/layout/__tests__/AdminTabs.test.tsx`  
**Testing**: `src/components/features/admin/layout/AdminTabs.tsx`

| Test Name | Description |
|-----------|-------------|
| should render all tabs with correct labels | Verifies all 6 tabs render with proper labels |
| should render with correct icons for each tab | Tests icon rendering for each tab |
| should have default active tab as overview | Verifies default tab selection |
| should set active tab based on activeTab prop | Tests controlled active tab |
| should handle all valid activeTab values | Verifies all tab values work |
| should update active tab when prop changes | Tests dynamic tab changes |
| should call onTabChange when a tab is clicked | Verifies callback on tab click |
| should call onTabChange for each tab click | Tests callbacks for all tabs |
| should not error when onTabChange is not provided | Verifies optional callback |
| should pass correct tab configuration to Tabs component | Tests tab data structure |
| should use correct icons for each tab | Verifies icon assignments |
| should pass setPage callback to all tabs | Tests callback propagation |
| should handle rapid tab switching | Verifies performance with fast clicks |
| should handle clicking on already active tab | Tests redundant click behavior |
| should handle undefined activeTab prop gracefully | Verifies default behavior |
| should maintain tab structure when rerendering | Tests render consistency |

### UI Components

#### Button Component Tests
**Test File**: `src/components/ui/__tests__/button.test.tsx`  
**Testing**: `src/components/ui/button.tsx`

| Test Name | Description |
|-----------|-------------|
| should render with default props | Verifies default button rendering |
| should forward ref correctly | Tests ref forwarding |
| should render as child component when asChild is true | Verifies polymorphic behavior |
| should render default variant correctly | Tests default styling |
| should render destructive variant correctly | Verifies destructive button style |
| should render outline variant correctly | Tests outline button style |
| should render secondary variant correctly | Verifies secondary style |
| should render ghost variant correctly | Tests ghost button style |
| should render link variant correctly | Verifies link-style button |
| should render default size correctly | Tests default sizing |
| should render small size correctly | Verifies small button size |
| should render large size correctly | Tests large button size |
| should render icon size correctly | Verifies icon button sizing |
| should handle onClick event | Tests click handler |
| should handle disabled state | Verifies disabled behavior |
| should merge custom className with variant classes | Tests style merging |
| should pass through HTML button attributes | Verifies attribute passing |
| should support ARIA attributes | Tests accessibility support |
| should handle keyboard navigation with Enter key | Verifies Enter key support |
| should handle keyboard navigation with Space key | Tests Space key support |
| should have focus-visible styles | Verifies focus indicators |
| should handle variant and size combination | Tests style combinations |
| should handle asChild with custom props | Verifies polymorphic props |
| should handle SVG icon styling | Tests icon styling |

#### Input Component Tests
**Test File**: `src/components/ui/__tests__/input.test.tsx`  
**Testing**: `src/components/ui/input.tsx`

| Test Name | Description |
|-----------|-------------|
| should render basic input with placeholder | Verifies basic rendering |
| should forward ref correctly | Tests ref forwarding |
| should render with correct base styles | Verifies default styling |
| should render [type] input type correctly (9 types) | Tests all input types |
| should default to text type when no type specified | Verifies default type |
| should handle disabled state | Tests disabled behavior |
| should handle readonly state | Verifies readonly functionality |
| should handle focus state | Tests focus styling |
| should handle onChange event | Verifies change handler |
| should handle onFocus event | Tests focus handler |
| should handle onBlur event | Verifies blur handler |
| should handle onKeyDown event | Tests keyboard handler |
| should handle form submission on Enter | Verifies form integration |
| should apply custom className | Tests custom styling |
| should have placeholder styling | Verifies placeholder styles |
| should have file input specific styling | Tests file input styles |
| should handle controlled input | Verifies controlled component |
| should handle uncontrolled input with defaultValue | Tests uncontrolled mode |
| should support aria attributes | Verifies accessibility |
| should work with label elements | Tests label association |
| should handle required attribute | Verifies required field |
| should handle maxLength attribute | Tests length restriction |
| should handle pattern validation | Verifies pattern matching |
| should handle autocomplete attribute | Tests autocomplete |
| should handle min and max for number inputs | Verifies number constraints |

#### Dialog Component Tests
**Test File**: `src/components/ui/__tests__/dialog.test.tsx`  
**Testing**: `src/components/ui/dialog.tsx`

| Test Name | Description |
|-----------|-------------|
| should be closed by default | Verifies initial closed state |
| should open when trigger is clicked | Tests opening behavior |
| should close when close button is clicked | Verifies close button |
| should respond to open prop changes | Tests controlled mode |
| should call onOpenChange when state changes | Verifies state callbacks |
| should render overlay when dialog is open | Tests overlay rendering |
| should close when overlay is clicked | Verifies backdrop click |
| should trap focus within dialog | Tests focus trapping |
| should close on Escape key press | Verifies keyboard closing |
| should have proper ARIA attributes | Tests accessibility |
| should have accessible close button | Verifies close button a11y |
| should render DialogHeader with correct styling | Tests header component |
| should render DialogFooter with correct layout | Verifies footer layout |
| should render DialogTitle with correct styling | Tests title styling |
| should render DialogDescription with correct styling | Verifies description |
| should handle multiple dialogs | Tests multiple instances |
| should handle custom trigger element | Verifies custom triggers |
| should handle DialogClose component | Tests close component |

---

## Hook Tests

### useUsers Hook Tests
**Test File**: `src/hooks/auth/__tests__/useUsers.test.tsx`  
**Testing**: `src/hooks/auth/useUsers.ts`

| Test Name | Description |
|-----------|-------------|
| should return initial loading state | Verifies initial hook state |
| should fetch organization users on mount | Tests data fetching |
| should handle successful data fetch | Verifies success case |
| should set user online status correctly | Tests online status logic |
| should set user active status based on last conversation | Verifies activity tracking |
| should handle users with no activity data | Tests edge case handling |
| should process invites correctly | Verifies invite processing |
| should update data when refetch is called | Tests manual refresh |
| should handle empty organization users | Verifies empty state |
| should process multiple invites | Tests multiple invites |
| should set isActive when user has recent global activity | Verifies global activity |
| should handle null values in last conversation data | Tests null handling |
| should combine org and global activity correctly | Verifies activity merging |
| should sort users by activity | Tests user sorting |
| should memoize processed users | Verifies performance optimization |
| should handle organization changes | Tests org switching |
| should cleanup on unmount | Verifies cleanup |

### useUser Hook Tests
**Test File**: `src/hooks/auth/__tests__/useUser.test.tsx`  
**Testing**: `src/hooks/auth/useUser.ts`

| Test Name | Description |
|-----------|-------------|
| should return user data from Clerk | Verifies Clerk integration |
| should return isSignedIn status | Tests auth status |
| should format user email correctly | Verifies email formatting |
| should return user name | Tests name retrieval |
| should handle user without last name | Verifies partial name |
| should handle user without any name | Tests missing name |
| should return false for isAdmin when not admin | Verifies non-admin state |
| should return true for isAdmin when user is admin | Tests admin detection |
| should fetch and set user profile | Verifies profile fetching |
| should handle profile fetch error | Tests error handling |
| should not fetch profile when user not signed in | Verifies conditional fetch |
| should update profile when user changes | Tests profile updates |
| should return loading state while fetching profile | Verifies loading state |
| should memoize user object | Tests performance |
| should handle sign out | Verifies logout behavior |
| should return null profile when not found | Tests missing profile |
| should refetch profile on window focus | Verifies refresh logic |

---

## Action Tests

### User Actions Tests
**Test File**: `src/actions/auth/users.test.ts`  
**Testing**: `src/actions/auth/users.ts`

| Test Name | Description |
|-----------|-------------|
| should return current user profile successfully | Tests profile retrieval |
| should return null when user not found | Verifies missing user case |
| should handle database query error | Tests error handling |
| should return user profile by clerk ID | Verifies ID-based lookup |
| should handle missing clerkId parameter | Tests parameter validation |
| should update user profile successfully | Verifies profile updates |
| should validate profile data before update | Tests data validation |
| should get all users successfully | Verifies user list retrieval |
| should return empty array when no users | Tests empty state |
| should get admin user successfully | Verifies admin detection |
| should return null when no admin exists | Tests missing admin |
| should handle multiple admin users | Verifies multiple admins |

### Conversation Actions Tests
**Test File**: `src/actions/chat/conversations.test.ts`  
**Testing**: `src/actions/chat/conversations.ts`

| Test Name | Description |
|-----------|-------------|
| should get user conversation successfully | Tests conversation retrieval |
| should create new conversation if none exists | Verifies auto-creation |
| should return messages with conversation | Tests message inclusion |
| should handle user without conversation | Verifies new user case |
| should validate user authorization | Tests auth validation |
| should get all user conversations | Verifies list retrieval |
| should filter by organization | Tests org filtering |
| should handle pagination | Verifies pagination |
| should update conversation successfully | Tests conversation updates |
| should delete conversation | Verifies deletion |
| should archive conversation | Tests archival |
| should search conversations | Verifies search functionality |

---

## Utility Tests

### Message Formatting Tests
**Test File**: `src/utils/message-formatting.test.ts`  
**Testing**: `src/utils/message-formatting.ts`

| Test Name | Description |
|-----------|-------------|
| should format code blocks with syntax highlighting | Tests code formatting |
| should preserve inline code | Verifies inline code handling |
| should convert markdown links to HTML | Tests link conversion |
| should handle bold text | Verifies bold formatting |
| should handle italic text | Tests italic formatting |
| should handle strikethrough | Verifies strikethrough |
| should process nested formatting | Tests complex formatting |
| should escape HTML entities | Verifies security |
| should handle empty strings | Tests edge case |
| should preserve whitespace in code blocks | Verifies code whitespace |
| should handle multiple code blocks | Tests multiple blocks |
| should format unordered lists | Verifies list formatting |
| should format ordered lists | Tests numbered lists |
| should handle blockquotes | Verifies quote formatting |
| should process headings | Tests heading levels |

### Date Formatting Tests
**Test File**: `src/utils/formatters/date.test.ts`  
**Testing**: `src/utils/formatters/date.ts`

| Test Name | Description |
|-----------|-------------|
| should format date as relative time | Tests relative formatting |
| should format "just now" for recent times | Verifies immediate times |
| should format "X minutes ago" | Tests minute formatting |
| should format "X hours ago" | Verifies hour formatting |
| should format "yesterday" | Tests yesterday detection |
| should format "X days ago" | Verifies day formatting |
| should format full date for old dates | Tests absolute dates |
| should handle invalid dates | Verifies error handling |
| should format timestamps | Tests timestamp conversion |
| should respect user locale | Verifies localization |
| should handle future dates | Tests future date handling |
| should format date ranges | Verifies range formatting |
| should handle null/undefined | Tests null safety |
| should format for different timezones | Verifies timezone handling |
| should provide custom format options | Tests format customization |

---

## Test Statistics

- **Total Test Files**: 13
- **Total Test Suites**: 13
- **Total Individual Tests**: 321
- **Categories**:
  - Component Tests: 180
  - Hook Tests: 34
  - Action Tests: 25
  - Utility Tests: 30

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run specific test file
```bash
npm test -- path/to/test/file.test.ts
```

### Run tests matching pattern
```bash
npm test -- --testNamePattern="should handle"
```

## Test Configuration

Tests are configured using Jest with the following key settings:
- Test environment: jsdom
- Module name mapper for path aliases
- Support for TypeScript via ts-jest
- React Testing Library for component tests
- Coverage thresholds can be configured in jest.config.js