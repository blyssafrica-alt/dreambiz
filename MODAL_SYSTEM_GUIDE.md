# Beautiful Modal System Guide

This app now features a comprehensive, beautifully designed modal system that replaces basic prompts with stunning UI components.

## 🎨 Available Modals

### 1. **ConfirmDialog** - Confirmation Prompts
Beautiful confirmation dialogs with icons and color-coded types.

```tsx
import { useConfirmDialog } from '@/hooks/useModal';
import { ConfirmDialog } from '@/components/modals';

function MyComponent() {
  const confirmDialog = useConfirmDialog();

  const handleDelete = () => {
    confirmDialog.confirm({
      title: 'Delete Item',
      message: 'Are you sure you want to delete this item? This action cannot be undone.',
      type: 'danger', // 'info' | 'warning' | 'danger' | 'success'
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        // Perform delete action
        console.log('Deleted!');
      },
    });
  };

  return (
    <>
      <Button onPress={handleDelete} title="Delete" />
      
      <ConfirmDialog
        visible={confirmDialog.visible}
        onClose={confirmDialog.hideModal}
        {...confirmDialog.props}
      />
    </>
  );
}
```

**Types:**
- `info` - Blue color scheme
- `warning` - Orange color scheme
- `danger` - Red color scheme
- `success` - Green color scheme

---

### 2. **AlertDialog** - Alert Messages
Eye-catching alerts with large icons and beautiful backgrounds.

```tsx
import { useAlertDialog } from '@/hooks/useModal';
import { AlertDialog } from '@/components/modals';

function MyComponent() {
  const alertDialog = useAlertDialog();

  const showSuccess = () => {
    alertDialog.alert({
      title: 'Payment Successful',
      message: 'Your payment has been processed successfully. You will receive a confirmation email shortly.',
      type: 'success', // 'info' | 'warning' | 'error' | 'success'
      buttonText: 'Great!',
    });
  };

  return (
    <>
      <Button onPress={showSuccess} title="Show Success" />
      
      <AlertDialog
        visible={alertDialog.visible}
        onClose={alertDialog.hideModal}
        {...alertDialog.props}
      />
    </>
  );
}
```

---

### 3. **InputDialog** - Text Input Prompts
Beautiful input dialogs with focus management and validation.

```tsx
import { useInputDialog } from '@/hooks/useModal';
import { InputDialog } from '@/components/modals';

function MyComponent() {
  const inputDialog = useInputDialog();

  const handleRename = () => {
    inputDialog.prompt({
      title: 'Rename Business',
      message: 'Enter a new name for your business',
      placeholder: 'Business name...',
      defaultValue: 'My Business',
      inputType: 'text', // 'text' | 'number' | 'email' | 'phone'
      multiline: false,
      maxLength: 50,
      onSubmit: async (value) => {
        // Handle submission
        console.log('New name:', value);
      },
    });
  };

  return (
    <>
      <Button onPress={handleRename} title="Rename" />
      
      <InputDialog
        visible={inputDialog.visible}
        onClose={inputDialog.hideModal}
        {...inputDialog.props}
      />
    </>
  );
}
```

---

### 4. **ActionSheet** - Action Lists
iOS-style action sheets with icons and options.

```tsx
import { useActionSheet } from '@/hooks/useModal';
import { ActionSheet } from '@/components/modals';
import { Edit, Share2, Download, Trash2 } from 'lucide-react-native';

function MyComponent() {
  const actionSheet = useActionSheet();

  const showOptions = () => {
    actionSheet.show({
      title: 'Document Options',
      message: 'What would you like to do with this document?',
      options: [
        {
          id: 'edit',
          label: 'Edit Document',
          icon: Edit,
          onPress: () => console.log('Edit'),
        },
        {
          id: 'share',
          label: 'Share',
          icon: Share2,
          iconColor: '#3B82F6',
          onPress: () => console.log('Share'),
        },
        {
          id: 'download',
          label: 'Download',
          icon: Download,
          onPress: () => console.log('Download'),
        },
        {
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          destructive: true, // Shows in red
          onPress: () => console.log('Delete'),
        },
        {
          id: 'archive',
          label: 'Archive (disabled)',
          disabled: true, // Grayed out and not clickable
          onPress: () => {},
        },
      ],
    });
  };

  return (
    <>
      <Button onPress={showOptions} title="Show Options" />
      
      <ActionSheet
        visible={actionSheet.visible}
        onClose={actionSheet.hideModal}
        {...actionSheet.props}
      />
    </>
  );
}
```

---

### 5. **LoadingDialog** - Loading States
Clean loading indicator with message.

```tsx
import { useState } from 'react';
import { LoadingDialog } from '@/components/modals';

function MyComponent() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await performAction();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onPress={handleSubmit} title="Submit" />
      
      <LoadingDialog
        visible={isLoading}
        message="Processing your request..."
      />
    </>
  );
}
```

---

### 6. **CustomModal** - Base Modal
Build your own custom modals with the base component.

```tsx
import { useState } from 'react';
import { CustomModal } from '@/components/modals';

function MyComponent() {
  const [visible, setVisible] = useState(false);

  return (
    <CustomModal
      visible={visible}
      onClose={() => setVisible(false)}
      title="Custom Content"
      showClose={true}
      height="auto" // 'auto' | 'full' | number
      animationType="slide" // 'slide' | 'fade' | 'scale'
    >
      <View style={{ padding: 24 }}>
        {/* Your custom content here */}
      </View>
    </CustomModal>
  );
}
```

---

## 🎭 Animation Types

All modals support three animation types:

1. **slide** - Slides up from bottom (default for action sheets)
2. **fade** - Fades in (default for loading dialogs)
3. **scale** - Scales from center with fade (default for dialogs)

---

## 🎨 Design Features

### Beautiful Animations
- Spring animations for natural feel
- Smooth transitions
- Platform-optimized performance

### Blur Background (iOS)
- Uses BlurView on iOS for beautiful backdrop
- Fallback to dark overlay on Android

### Theme Support
- Fully integrated with app theme
- Light and dark mode support
- Dynamic colors based on modal type

### Accessibility
- Keyboard-friendly
- Focus management
- Proper touch targets

### Icons & Colors
- Color-coded by type (info, warning, danger, success)
- Lucide icons throughout
- Custom icon support

---

## 📱 Usage Examples

### Delete Confirmation
```tsx
confirmDialog.confirm({
  title: 'Delete Account',
  message: 'This will permanently delete your account and all data.',
  type: 'danger',
  confirmText: 'Delete Forever',
  onConfirm: async () => await deleteAccount(),
});
```

### Success Alert
```tsx
alertDialog.alert({
  title: 'All Done!',
  message: 'Your changes have been saved successfully.',
  type: 'success',
});
```

### Input with Validation
```tsx
inputDialog.prompt({
  title: 'Enter Amount',
  placeholder: '0.00',
  inputType: 'number',
  onSubmit: async (value) => {
    const amount = parseFloat(value);
    if (amount > 0) {
      await processPayment(amount);
    }
  },
});
```

### Multi-line Text Input
```tsx
inputDialog.prompt({
  title: 'Add Notes',
  message: 'Enter any additional notes',
  placeholder: 'Type your notes here...',
  multiline: true,
  maxLength: 500,
  onSubmit: async (notes) => await saveNotes(notes),
});
```

---

## 🚀 Benefits

✅ **Beautiful Design** - Modern, polished UI that matches your app
✅ **Consistent UX** - Same look and feel throughout the app
✅ **Easy to Use** - Simple hook-based API
✅ **Type Safe** - Full TypeScript support
✅ **Customizable** - Flexible props for different use cases
✅ **Accessible** - Keyboard and screen reader friendly
✅ **Performant** - Optimized animations and rendering

---

## 💡 Best Practices

1. **Use the right modal for the task**
   - ConfirmDialog for destructive actions
   - AlertDialog for notifications
   - InputDialog for user input
   - ActionSheet for multiple options

2. **Keep messages clear and concise**
   - Short, descriptive titles
   - Clear action buttons
   - Helpful context in message

3. **Use appropriate types**
   - 'danger' for destructive actions
   - 'warning' for caution
   - 'success' for confirmations
   - 'info' for general information

4. **Handle loading states**
   - Show LoadingDialog for async operations
   - Use isLoading prop in dialogs

---

## 🎯 Migration Guide

### Before (Basic Alert)
```tsx
Alert.alert('Delete', 'Are you sure?', [
  { text: 'Cancel' },
  { text: 'Delete', onPress: handleDelete },
]);
```

### After (Beautiful Modal)
```tsx
confirmDialog.confirm({
  title: 'Delete Item',
  message: 'Are you sure you want to delete this item?',
  type: 'danger',
  confirmText: 'Delete',
  onConfirm: handleDelete,
});
```

---

## 📦 Files

- `components/modals/CustomModal.tsx` - Base modal component
- `components/modals/ConfirmDialog.tsx` - Confirmation dialog
- `components/modals/AlertDialog.tsx` - Alert messages
- `components/modals/InputDialog.tsx` - Input prompts
- `components/modals/ActionSheet.tsx` - Action lists
- `components/modals/LoadingDialog.tsx` - Loading states
- `hooks/useModal.tsx` - Modal management hooks
- `components/modals/index.ts` - Exports

---

Enjoy your beautiful modal system! 🎉
