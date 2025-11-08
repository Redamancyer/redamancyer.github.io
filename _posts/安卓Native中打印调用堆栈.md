# 安卓Native中打印调用堆栈
## libutilscallstack
1. 编译文件中添加shared_libs:libutilscallstack、libutils.

```cpp
// Android.bp
cc_defaults {
    name: "xxxxxxxxxxx",

    shared_libs: [
        "xxxxx",
        "libutils",
        "libutilscallstack",
    ],
}
// Android.mk：
LOCAL_SHARED_LIBRARIES := \
+   libutils\
+   libutilscallstack \
```
2. 在cpp文件中添加头文件

```cpp
#include <utils/CallStack.h>
```
3. 打印堆栈

```cpp
// 引用对象
using ::android::CallStack;

CallStack stack; 
stack.update();
stack.log("native", ANDROID_LOG_ERROR);
```

> 这种方式碰到连环依赖且很多的时候就很难搞了，可以使用第二种。

## 使用标准 backtrace

```cpp
#include <utils/Log.h>
#include <execinfo.h>

void printSimpleStack() {
    const int maxFrames = 15;
    void* buffer[maxFrames];
    int frames = backtrace(buffer, maxFrames);
    
    if (frames > 0) {
        ALOGE("Call Stack (%d frames):", frames);
        // 跳过前2帧（当前函数和printSimpleStack本身）
        for (int i = 2; i < frames && i < 10; i++) {
            ALOGE("  [%d] %p", i, buffer[i]);
        }
    }
}

ScopedAStatus Component::queue(const WorkBundle& workBundle) {
    LOG(INFO) << "wfj,Component::queue";
    printSimpleStack();
    
    std::list<std::unique_ptr<C2Work>> c2works;
    // ... 其他代码
}
```
> 笔者使用的时候遇到了编译不支持，可能是这段代码的api是30太低了。所以用了第三种。
```cpp
error: 'backtrace' is only available on Android 33 or newer [-Werror,-Wunguarded-availability]
```

## 使用_Unwind_Backtrace（兼容高）
```cpp
#include <utils/Log.h> // 用于 ALOGE
#include <unwind.h>
#include <dlfcn.h>
#include <cxxabi.h>

struct BacktraceState {
    uintptr_t* current;
    uintptr_t* end;
};

static _Unwind_Reason_Code unwindCallback(struct _Unwind_Context* context, void* arg) {
    BacktraceState* state = static_cast<BacktraceState*>(arg);
    uintptr_t pc = _Unwind_GetIP(context);
    if (pc) {
        if (state->current == state->end) {
            return _URC_END_OF_STACK;
        } else {
            *state->current++ = pc;
        }
    }
    return _URC_NO_REASON;
}

size_t captureBacktrace(uintptr_t* buffer, size_t max) {
    BacktraceState state = {buffer, buffer + max};
    _Unwind_Backtrace(unwindCallback, &state);
    return state.current - buffer;
}

void printCallStack() {
    const size_t max = 30;
    uintptr_t buffer[max];
    size_t count = captureBacktrace(buffer, max);
    
    ALOGE("=== Call Stack (%zu frames) ===", count);
    for (size_t i = 0; i < count; i++) {
        const uintptr_t pc = buffer[i];
        Dl_info info;
        if (dladdr(reinterpret_cast<const void*>(pc), &info)) {
            const char* symbol = info.dli_sname ? info.dli_sname : "???";
            int status;
            char* demangled = abi::__cxa_demangle(symbol, nullptr, nullptr, &status);
            const char* name = (status == 0 && demangled) ? demangled : symbol;
            ALOGE("#%02zu pc %08" PRIxPTR " %s", i, pc - (uintptr_t)info.dli_fbase, name);
            if (demangled) {
                free(demangled);
            }
        } else {
            ALOGE("#%02zu pc %08" PRIxPTR, i, pc);
        }
    }
    ALOGE("===============================");
}

// 在你的函数中使用
ScopedAStatus Component::queue(const WorkBundle& workBundle) {
    LOG(INFO) << "wfj,Component::queue";
    printCallStack(); // 打印调用堆栈
    std::list<std::unique_ptr<C2Work>> c2works;
    // ... 其他代码
}
```
这个使用没问题，但是打印的堆栈看起来还有点问题，持续更新中。。。

