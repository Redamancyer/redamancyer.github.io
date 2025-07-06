# Android内容提供器(Content Provider)学习总结

## 一、内容提供器简介

### 1. 基本概念

内容提供器(Content Provider)是Android四大组件之一，主要用于**不同应用程序间的数据共享**，提供了一套标准化的接口来访问和操作数据。

### 2. 核心特点
- **数据抽象**：隐藏底层数据存储细节
- **统一接口**：提供增删改查(CRUD)的标准接口
- **跨进程访问**：支持不同应用间的数据共享
- **权限控制**：可通过权限机制保护数据安全

### 3. 常见使用场景

- 共享应用私有数据给其他应用(如通讯录)
- 从其他应用获取数据(如读取媒体库)
- 实现跨进程数据共享
- 为搜索框架提供应用数据

## 二、内容提供器的基本使用

### 1. 系统内置的内容提供器
Android系统提供了许多内置的内容提供器：
- 联系人：`ContactsContract`
- 媒体库：`MediaStore`
- 日历：`CalendarContract`
- 设置：`Settings`

### 2. 访问内容提供器的基本步骤
1. 获取ContentResolver对象
2. 构造内容URI
3. 通过ContentResolver执行CRUD操作

```java
// 获取ContentResolver
ContentResolver resolver = getContentResolver();

// 查询联系人
Cursor cursor = resolver.query(
    ContactsContract.CommonDataKinds.Phone.CONTENT_URI, // 内容URI
    null, // 返回列
    null, // 查询条件
    null, // 条件参数
    null  // 排序
);

// 遍历结果
if (cursor != null) {
    while (cursor.moveToNext()) {
        String name = cursor.getString(cursor.getColumnIndex(
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME));
        String number = cursor.getString(cursor.getColumnIndex(
            ContactsContract.CommonDataKinds.Phone.NUMBER));
        Log.d("Contact", name + ": " + number);
    }
    cursor.close();
}
```

### 3. 内容URI的组成
内容URI的标准格式：`content://authority/path/id`
- `content://`：固定前缀
- `authority`：提供器的唯一标识(通常是包名)
- `path`：数据路径(表名)
- `id`：可选，特定记录的ID

## 三、创建自定义内容提供器

### 1. 创建步骤
1. 继承ContentProvider类
2. 实现六个核心方法
3. 在AndroidManifest.xml中注册
4. 定义内容URI和MIME类型

### 2. 实现示例

```java
public class MyProvider extends ContentProvider {
    private static final String AUTHORITY = "com.example.provider";
    private static final Uri CONTENT_URI = Uri.parse("content://" + AUTHORITY + "/books");
    
    private SQLiteDatabase db;

    // 定义MIME类型
    private static final String MIME_DIR = "vnd.android.cursor.dir/vnd.com.example.provider.books";
    private static final String MIME_ITEM = "vnd.android.cursor.item/vnd.com.example.provider.books";

    @Override
    public boolean onCreate() {
        // 初始化数据库
        MyDatabaseHelper helper = new MyDatabaseHelper(getContext());
        db = helper.getWritableDatabase();
        return (db != null);
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection,
                        String[] selectionArgs, String sortOrder) {
        // 查询数据
        Cursor cursor = db.query("books", projection, selection, 
            selectionArgs, null, null, sortOrder);
        cursor.setNotificationUri(getContext().getContentResolver(), uri);
        return cursor;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        // 插入数据
        long id = db.insert("books", null, values);
        if (id > 0) {
            Uri newUri = ContentUris.withAppendedId(CONTENT_URI, id);
            getContext().getContentResolver().notifyChange(newUri, null);
            return newUri;
        }
        return null;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection,
                      String[] selectionArgs) {
        // 更新数据
        int count = db.update("books", values, selection, selectionArgs);
        if (count > 0) {
            getContext().getContentResolver().notifyChange(uri, null);
        }
        return count;
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        // 删除数据
        int count = db.delete("books", selection, selectionArgs);
        if (count > 0) {
            getContext().getContentResolver().notifyChange(uri, null);
        }
        return count;
    }

    @Override
    public String getType(Uri uri) {
        // 返回MIME类型
        switch (sUriMatcher.match(uri)) {
            case BOOKS:
                return MIME_DIR;
            case BOOK_ID:
                return MIME_ITEM;
            default:
                throw new IllegalArgumentException("Unknown URI: " + uri);
        }
    }
}
```

### 3. 注册内容提供器

```xml
<provider
    android:name=".MyProvider"
    android:authorities="com.example.provider"
    android:exported="true"  <!-- 是否允许其他应用访问 -->
    android:readPermission="com.example.READ_PERMISSION"  <!-- 可选 -->
    android:writePermission="com.example.WRITE_PERMISSION" <!-- 可选 -->
/>
```

## 四、内容提供器高级特性

### 1. UriMatcher的使用
用于匹配不同的URI请求

```java
private static final UriMatcher sUriMatcher = new UriMatcher(UriMatcher.NO_MATCH);

// URI匹配码
private static final int BOOKS = 1;
private static final int BOOK_ID = 2;

static {
    sUriMatcher.addURI(AUTHORITY, "books", BOOKS);
    sUriMatcher.addURI(AUTHORITY, "books/#", BOOK_ID);
}

// 在query/insert/update/delete方法中使用
switch (sUriMatcher.match(uri)) {
    case BOOKS:
        // 处理整个表
        break;
    case BOOK_ID:
        // 处理特定ID的记录
        String id = uri.getLastPathSegment();
        selection = "_id = ?";
        selectionArgs = new String[]{id};
        break;
    default:
        throw new IllegalArgumentException("Unknown URI: " + uri);
}
```

### 2. ContentObserver数据监听
允许应用监听数据变化

```java
// 注册内容观察者
getContentResolver().registerContentObserver(
    MyProvider.CONTENT_URI,
    true, // 是否监听子URI
    new ContentObserver(new Handler()) {
        @Override
        public void onChange(boolean selfChange) {
            // 数据变化时的处理
            refreshData();
        }
    });

// 在提供器中通知数据变化
getContext().getContentResolver().notifyChange(uri, null);
```

### 3. 批量操作
提高批量数据操作的效率

```java
ArrayList<ContentProviderOperation> operations = new ArrayList<>();
operations.add(ContentProviderOperation.newInsert(CONTENT_URI)
    .withValue("title", "Book1")
    .withValue("author", "Author1")
    .build());
operations.add(ContentProviderOperation.newInsert(CONTENT_URI)
    .withValue("title", "Book2")
    .withValue("author", "Author2")
    .build());

try {
    ContentProviderResult[] results = getContentResolver().applyBatch(AUTHORITY, operations);
} catch (RemoteException | OperationApplicationException e) {
    e.printStackTrace();
}
```

## 五、安全与权限控制

### 1. 权限声明
```xml
<!-- 在提供者应用中声明权限 -->
<permission
    android:name="com.example.READ_PERMISSION"
    android:protectionLevel="normal"/>
<permission
    android:name="com.example.WRITE_PERMISSION"
    android:protectionLevel="dangerous"/>

<!-- 在客户端应用中请求权限 -->
<uses-permission android:name="com.example.READ_PERMISSION"/>
<uses-permission android:name="com.example.WRITE_PERMISSION"/>
```

### 2. 路径权限
可以在provider中为不同路径设置不同权限

```xml
<provider android:name=".MyProvider"
    android:authorities="com.example.provider"
    android:exported="true">
    <path-permission
        android:pathPrefix="/public"
        android:permission="com.example.READ_PERMISSION"/>
    <path-permission
        android:pathPrefix="/private"
        android:permission="com.example.WRITE_PERMISSION"
        android:readPermission="com.example.READ_PERMISSION"/>
</provider>
```

### 3. Android 11+的包可见性限制
从Android 11开始，需要声明要交互的包名：

```xml
<queries>
    <package android:name="com.example.providerapp" />
</queries>
```
