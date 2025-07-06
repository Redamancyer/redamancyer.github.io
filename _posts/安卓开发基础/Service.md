# Android Service

## 一、Service 基础概念

### 1. Service 是什么

Service 是 Android 四大组件之一，主要用于在后台执行长时间运行的操作，不提供用户界面。

### 2. Service 的特点
- **后台运行**：无用户界面，适合执行不干扰用户的操作
- **优先级较高**：比普通Activity存活时间长
- **两种启动方式**：startService() 和 bindService()
- **主线程运行**：默认运行在主线程，需手动创建子线程执行耗时操作

### 3. Service 生命周期

![Service生命周期](https://developer.android.com/images/service_lifecycle.png)

### 4. Service 与 Thread 的区别
| 特性       | Service      | Thread     |
| ---------- | ------------ | ---------- |
| 运行环境   | 主线程(默认) | 独立子线程 |
| 生命周期   | 系统管理     | 开发者管理 |
| 跨进程能力 | 支持         | 不支持     |
| 优先级     | 较高         | 较低       |
| 用途       | 后台任务     | 异步任务   |

## 二、Service 的基本使用

### 1. 创建 Service
```java
public class MyService extends Service {
    private static final String TAG = "MyService";
    
    // 必须实现的方法
    @Override
    public IBinder onBind(Intent intent) {
        return null; // 对于startService方式返回null
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "onCreate executed");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "onStartCommand executed");
        // 执行后台任务
        new Thread(() -> {
            // 模拟耗时操作
            try {
                Thread.sleep(5000);
                Log.d(TAG, "任务执行完成");
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }).start();
        
        return START_STICKY; // 服务被杀死后的行为策略
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "onDestroy executed");
    }
}
```

### 2. 注册 Service
在 AndroidManifest.xml 中声明：
```xml
<service android:name=".MyService" />
```

### 3. 启动和停止 Service
```java
// 启动服务
Intent startIntent = new Intent(this, MyService.class);
startService(startIntent);

// 停止服务
Intent stopIntent = new Intent(this, MyService.class);
stopService(stopIntent);

// 服务内部停止自身
stopSelf();
```

### 4. onStartCommand 返回值
- `START_STICKY`：服务被杀死后自动重建，但intent为null
- `START_NOT_STICKY`：服务被杀死后不会自动重建
- `START_REDELIVER_INTENT`：服务被杀死后重建并重传最后一个intent
- `START_STICKY_COMPATIBILITY`：START_STICKY的兼容版本，不保证重建

## 三、绑定服务(Bound Service)

### 1. 创建绑定服务
```java
public class BindService extends Service {
    private MyBinder mBinder = new MyBinder();
    
    class MyBinder extends Binder {
        public BindService getService() {
            return BindService.this;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return mBinder;
    }
    
    // 自定义方法供客户端调用
    public void customMethod() {
        Log.d("BindService", "自定义方法被调用");
    }
}
```

### 2. 绑定和解绑服务
```java
private BindService mService;
private boolean isBound = false;

private ServiceConnection connection = new ServiceConnection() {
    @Override
    public void onServiceConnected(ComponentName name, IBinder service) {
        BindService.MyBinder binder = (BindService.MyBinder) service;
        mService = binder.getService();
        isBound = true;
        mService.customMethod(); // 调用服务方法
    }

    @Override
    public void onServiceDisconnected(ComponentName name) {
        isBound = false;
    }
};

// 绑定服务
Intent bindIntent = new Intent(this, BindService.class);
bindService(bindIntent, connection, Context.BIND_AUTO_CREATE);

// 解绑服务
if (isBound) {
    unbindService(connection);
    isBound = false;
}
```

### 3. 绑定模式参数
- `BIND_AUTO_CREATE`：绑定后自动创建服务
- `BIND_DEBUG_UNBIND`：调试用，记录unbind调用栈
- `BIND_NOT_FOREGROUND`：服务不会提升为前台服务
- `BIND_ABOVE_CLIENT`：服务优先级高于客户端
- `BIND_ALLOW_OOM_MANAGEMENT`：允许系统在内存不足时杀死服务

## 四、前台服务(Foreground Service)

### 1. 创建前台服务
Android 8.0+ 必须使用通知显示前台服务

```java
public class ForegroundService extends Service {
    private static final int NOTIFICATION_ID = 1;
    private static final String CHANNEL_ID = "ForegroundServiceChannel";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this,
                0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("前台服务")
                .setContentText("服务正在运行")
                .setSmallIcon(R.drawable.ic_notification)
                .setContentIntent(pendingIntent)
                .build();

        startForeground(NOTIFICATION_ID, notification);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Foreground Service Channel",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(serviceChannel);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
```

### 2. 启动前台服务
```java
// Android 9.0+需要权限
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
    startForegroundService(new Intent(this, ForegroundService.class));
} else {
    startService(new Intent(this, ForegroundService.class));
}
```

### 3. 前台服务注意事项
- 必须5秒内调用startForeground()显示通知
- Android 9.0+需要FOREGROUND_SERVICE权限
- 通知不能删除，除非服务停止
- 不同Android版本有不同行为要求

## 五、IntentService 和 JobIntentService

### 1. IntentService (已弃用，Android 8.0+推荐使用JobIntentService)
```java
public class MyIntentService extends IntentService {
    public MyIntentService() {
        super("MyIntentService");
    }

    @Override
    protected void onHandleIntent(@Nullable Intent intent) {
        // 在子线程执行任务
        String action = intent.getStringExtra("task_action");
        Log.d("IntentService", "执行任务: " + action);
        try {
            Thread.sleep(3000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d("IntentService", "服务销毁");
    }
}
```

### 2. JobIntentService (兼容替代方案)
```java
public class MyJobIntentService extends JobIntentService {
    public static final int JOB_ID = 1;
    
    public static void enqueueWork(Context context, Intent work) {
        enqueueWork(context, MyJobIntentService.class, JOB_ID, work);
    }

    @Override
    protected void onHandleWork(@NonNull Intent intent) {
        // 执行后台任务
        String action = intent.getStringExtra("task_action");
        Log.d("JobIntentService", "执行任务: " + action);
        try {
            Thread.sleep(3000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

## 六、服务通信

### 1. 使用 Messenger 跨进程通信
**服务端实现：**
```java
public class MessengerService extends Service {
    private static final String TAG = "MessengerService";
    static final int MSG_SAY_HELLO = 1;

    class IncomingHandler extends Handler {
        @Override
        public void handleMessage(Message msg) {
            switch (msg.what) {
                case MSG_SAY_HELLO:
                    Log.d(TAG, "收到客户端消息: " + msg.getData().getString("msg"));
                    
                    // 回复客户端
                    Messenger client = msg.replyTo;
                    Message replyMsg = Message.obtain(null, MSG_SAY_HELLO);
                    Bundle bundle = new Bundle();
                    bundle.putString("reply", "你好客户端，我已收到你的消息");
                    replyMsg.setData(bundle);
                    try {
                        client.send(replyMsg);
                    } catch (RemoteException e) {
                        e.printStackTrace();
                    }
                    break;
                default:
                    super.handleMessage(msg);
            }
        }
    }

    final Messenger mMessenger = new Messenger(new IncomingHandler());

    @Override
    public IBinder onBind(Intent intent) {
        return mMessenger.getBinder();
    }
}
```

**客户端实现：**
```java
private Messenger mService;
private boolean isBound;

private Messenger mReplyMessenger = new Messenger(new Handler(Looper.getMainLooper()) {
    @Override
    public void handleMessage(Message msg) {
        switch (msg.what) {
            case MessengerService.MSG_SAY_HELLO:
                String reply = msg.getData().getString("reply");
                Log.d("Client", "收到服务端回复: " + reply);
                break;
            default:
                super.handleMessage(msg);
        }
    }
});

private ServiceConnection mConnection = new ServiceConnection() {
    public void onServiceConnected(ComponentName className, IBinder service) {
        mService = new Messenger(service);
        isBound = true;
        
        // 发送消息给服务端
        Message msg = Message.obtain(null, MessengerService.MSG_SAY_HELLO);
        Bundle data = new Bundle();
        data.putString("msg", "你好服务端");
        msg.setData(data);
        msg.replyTo = mReplyMessenger;
        try {
            mService.send(msg);
        } catch (RemoteException e) {
            e.printStackTrace();
        }
    }

    public void onServiceDisconnected(ComponentName className) {
        mService = null;
        isBound = false;
    }
};
```

### 2. 使用 AIDL 跨进程通信
**定义 AIDL 接口：**
```aidl
// IMyAidlInterface.aidl
interface IMyAidlInterface {
    int add(int a, int b);
    String greet(String name);
}
```

**服务端实现：**
```java
public class AIDLService extends Service {
    private final IMyAidlInterface.Stub mBinder = new IMyAidlInterface.Stub() {
        @Override
        public int add(int a, int b) throws RemoteException {
            return a + b;
        }

        @Override
        public String greet(String name) throws RemoteException {
            return "Hello, " + name;
        }
    };

    @Override
    public IBinder onBind(Intent intent) {
        return mBinder;
    }
}
```

**客户端实现：**
```java
private IMyAidlInterface mService;
private ServiceConnection mConnection = new ServiceConnection() {
    @Override
    public void onServiceConnected(ComponentName name, IBinder service) {
        mService = IMyAidlInterface.Stub.asInterface(service);
        try {
            int result = mService.add(3, 5);
            String greeting = mService.greet("Android");
            Log.d("AIDL", "3 + 5 = " + result);
            Log.d("AIDL", greeting);
        } catch (RemoteException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onServiceDisconnected(ComponentName name) {
        mService = null;
    }
};

// 绑定服务
Intent intent = new Intent();
intent.setComponent(new ComponentName("com.example.serviceapp",
        "com.example.serviceapp.AIDLService"));
bindService(intent, mConnection, Context.BIND_AUTO_CREATE);
```

## 七、服务的最佳实践

### 1. 服务选择策略
- **前台服务**：需要用户感知的长时间任务(如音乐播放、文件下载)
- **绑定服务**：需要与Activity交互的后台任务
- **IntentService/JobIntentService**：一次性后台任务
- **JobScheduler/WorkManager**：Android 5.0+推荐使用的后台任务调度

### 2. 性能优化建议
- 避免在主线程执行耗时操作
- 合理使用前台服务，减少通知干扰
- 及时释放资源，避免内存泄漏
- 使用WakeLock保持CPU运行时注意及时释放

### 3. 不同Android版本的适配
- **Android 8.0+**：后台执行限制，需使用前台服务
- **Android 9.0+**：需要FOREGROUND_SERVICE权限
- **Android 10+**：更严格的后台启动限制
- **Android 12+**：前台服务启动限制，需添加权限

### 4. 常见问题解决方案
1. **ANR问题**：将耗时操作移到子线程
2. **内存泄漏**：确保解绑服务和停止服务
3. **服务被杀死**：根据需求选择合适的onStartCommand返回值
4. **跨进程通信失败**：检查AIDL接口是否一致，权限是否配置正确

通过全面掌握Service的使用方法，开发者可以构建高效、稳定的后台任务处理机制，提升应用的用户体验和性能表现。