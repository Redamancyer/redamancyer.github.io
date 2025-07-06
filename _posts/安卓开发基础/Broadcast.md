# Android广播机制

## 一、广播机制简介

### 1. 广播的概念
广播(Broadcast)是Android四大组件之一，是一种广泛运用的应用程序间通信机制。它遵循发布-订阅模式，允许应用程序发送或接收系统或应用内部的消息通知。

### 2. 广播的特点
- **跨进程通信**：可以在不同应用间传递消息
- **异步执行**：发送广播后不需要等待接收者处理
- **低耦合**：发送方和接收方不需要知道对方的存在

### 3. 广播的类型
- **标准广播(Normal Broadcast)**：完全异步，所有接收者几乎同时接收
- **有序广播(Ordered Broadcast)**：同步执行，按照优先级顺序传递
- **本地广播(Local Broadcast)**：只在应用内部传递，更安全高效
- **粘性广播(Sticky Broadcast)**：已废弃(Android 5.0+)

### 4. 广播的使用场景
- 系统事件通知(如网络状态变化、电池电量低)
- 应用内部组件通信
- 应用间简单的数据传递

## 二、接收系统广播

### 1. 动态注册广播接收器
动态注册在代码中完成，需要随组件生命周期管理。

```java
// 创建广播接收器
private BroadcastReceiver networkChangeReceiver = new BroadcastReceiver() {
    @Override
    public void onReceive(Context context, Intent intent) {
        ConnectivityManager manager = (ConnectivityManager) 
            getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo networkInfo = manager.getActiveNetworkInfo();
        if (networkInfo != null && networkInfo.isAvailable()) {
            Toast.makeText(context, "网络已连接", Toast.LENGTH_SHORT).show();
        } else {
            Toast.makeText(context, "网络断开", Toast.LENGTH_SHORT).show();
        }
    }
};

// 在Activity中注册
@Override
protected void onResume() {
    super.onResume();
    IntentFilter filter = new IntentFilter();
    filter.addAction("android.net.conn.CONNECTIVITY_CHANGE");
    registerReceiver(networkChangeReceiver, filter);
}

// 在Activity中取消注册
@Override
protected void onPause() {
    super.onPause();
    unregisterReceiver(networkChangeReceiver);
}
```

### 2. 静态注册广播接收器
静态注册在AndroidManifest.xml中声明，常驻系统。

```xml
<receiver android:name=".BootCompleteReceiver"
    android:enabled="true"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.BOOT_COMPLETED"/>
    </intent-filter>
</receiver>
```

对应的接收器类：
```java
public class BootCompleteReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Toast.makeText(context, "系统启动完成", Toast.LENGTH_LONG).show();
        }
    }
}
```

### 3. 常见系统广播Action
- `Intent.ACTION_BOOT_COMPLETED`：系统启动完成
- `Intent.ACTION_BATTERY_LOW`：电池电量低
- `Intent.ACTION_BATTERY_OKAY`：电池电量恢复
- `Intent.ACTION_POWER_CONNECTED`：连接电源
- `Intent.ACTION_POWER_DISCONNECTED`：断开电源
- `ConnectivityManager.CONNECTIVITY_ACTION`：网络状态变化
- `Intent.ACTION_AIRPLANE_MODE_CHANGED`：飞行模式切换

### 4. 注意事项
- Android 8.0+对静态注册广播有严格限制
- 动态注册的广播接收器必须及时注销，否则会导致内存泄漏
- 不要在广播接收器中进行耗时操作(超过10秒可能导致ANR)

## 三、发送自定义广播

### 1. 发送标准广播
```java
// 发送广播
Intent intent = new Intent("com.example.MY_BROADCAST");
intent.setPackage(getPackageName()); // Android 8.0+需要设置包名
intent.putExtra("data", "这是一条广播消息");
sendBroadcast(intent);

// 接收广播(动态注册)
BroadcastReceiver myReceiver = new BroadcastReceiver() {
    @Override
    public void onReceive(Context context, Intent intent) {
        String data = intent.getStringExtra("data");
        Toast.makeText(context, "收到广播: " + data, Toast.LENGTH_SHORT).show();
    }
};

IntentFilter filter = new IntentFilter("com.example.MY_BROADCAST");
registerReceiver(myReceiver, filter);
```

### 2. 发送有序广播
```java
// 发送有序广播
Intent intent = new Intent("com.example.ORDERED_BROADCAST");
intent.putExtra("data", "有序广播初始数据");
sendOrderedBroadcast(intent, null);

// 高优先级接收器
<receiver android:name=".HighPriorityReceiver">
    <intent-filter android:priority="100">
        <action android:name="com.example.ORDERED_BROADCAST"/>
    </intent-filter>
</receiver>

// 低优先级接收器
<receiver android:name=".LowPriorityReceiver">
    <intent-filter android:priority="50">
        <action android:name="com.example.ORDERED_BROADCAST"/>
    </intent-filter>
</receiver>

// 在接收器中可以修改数据或终止广播
public class HighPriorityReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        // 获取数据
        String data = getResultData();
        // 修改数据
        setResultData("高优先级修改后的数据");
        // 如果需要终止广播
        // abortBroadcast();
    }
}
```

### 3. 带权限的广播
```xml
<!-- 声明权限 -->
<permission android:name="com.example.MY_PERMISSION"
    android:protectionLevel="normal"/>

<!-- 发送带权限的广播 -->
sendBroadcast(intent, "com.example.MY_PERMISSION");

<!-- 接收器需要声明权限 -->
<receiver android:name=".MyReceiver"
    android:permission="com.example.MY_PERMISSION">
    <intent-filter>
        <action android:name="com.example.MY_BROADCAST"/>
    </intent-filter>
</receiver>
```

## 四、使用本地广播

### 1. 本地广播的特点
- 只在应用内部传播，更安全
- 效率更高(不需要跨进程通信)
- 不需要担心安全问题，不需要动态注册

### 2. 本地广播的使用
```java
// 获取LocalBroadcastManager实例
LocalBroadcastManager localBroadcastManager = LocalBroadcastManager.getInstance(this);

// 发送本地广播
Intent intent = new Intent("com.example.LOCAL_BROADCAST");
intent.putExtra("data", "本地广播消息");
localBroadcastManager.sendBroadcast(intent);

// 注册本地广播接收器
BroadcastReceiver localReceiver = new BroadcastReceiver() {
    @Override
    public void onReceive(Context context, Intent intent) {
        String data = intent.getStringExtra("data");
        Toast.makeText(context, "收到本地广播: " + data, Toast.LENGTH_SHORT).show();
    }
};

IntentFilter filter = new IntentFilter("com.example.LOCAL_BROADCAST");
localBroadcastManager.registerReceiver(localReceiver, filter);

// 取消注册
localBroadcastManager.unregisterReceiver(localReceiver);
```

### 3. 本地广播的优势
1. **安全性**：广播不会离开应用，不用担心数据泄露
2. **高效性**：不需要跨进程通信，效率更高
3. **便利性**：不需要担心其他应用的干扰
4. **生命周期管理**：与全局广播相比更简单

## 五、最佳实践与注意事项

### 1. 广播使用建议
- 优先使用本地广播进行应用内部通信
- 对于系统事件，尽量使用动态注册
- 避免在广播接收器中执行耗时操作
- Android 8.0+限制隐式广播，应使用显式广播或JobScheduler

### 2. Android版本适配
- **Android 7.0+**：禁止发送`ACTION_NEW_PICTURE`和`ACTION_NEW_VIDEO`广播
- **Android 8.0+**：对静态注册的隐式广播做了严格限制
- **Android 9.0+**：`NETWORK_STATE_CHANGED_ACTION`广播不再接收WiFi信息

### 3. 替代方案

对于需要频繁通信或大数据量传输的场景，考虑使用：
- `LocalBroadcastManager`(已弃用，可用LiveData替代)
- `RxJava`或`EventBus`等事件总线框架
- `ContentProvider`共享数据
- `Bound Service`进行进程间通信
