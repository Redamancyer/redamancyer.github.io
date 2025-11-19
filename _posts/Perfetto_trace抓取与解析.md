# Perfetto_trace抓取与解析

## trace抓取

- 新建config.txt
  ```
  buffers {
    size_kb: 3072000
    fill_policy: RING_BUFFER
  }
  buffers {
    size_kb: 1536000
    fill_policy: RING_BUFFER
  }
  
  data_sources: {
  	config {
  		name: "android.surfaceflinger.frametimeline"
  	}
  }
  
  data_sources: {
  	config {
  		name: "linux.process_stats"
  		target_buffer: 1
  		process_stats_config {
  			scan_all_processes_on_start: true
  			proc_stats_poll_ms: 250
  		}
  	}
  }
  
  data_sources: {
  	config {
  		name: "linux.sys_stats"
  		sys_stats_config {
  			meminfo_period_ms: 250
  			meminfo_counters: MEMINFO_ANON_PAGES
  			meminfo_counters: MEMINFO_ACTIVE_ANON
  			meminfo_counters: MEMINFO_ACTIVE_FILE
  			meminfo_counters: MEMINFO_INACTIVE_ANON
  			meminfo_counters: MEMINFO_INACTIVE_FILE
  			meminfo_counters: MEMINFO_MEM_FREE
  			stat_period_ms: 250
  			stat_counters: STAT_CPU_TIMES
  			stat_counters: STAT_FORK_COUNT
  		}
  	}
  }
  
  
  data_sources {
    config {
      name: "android.log"
      android_log_config {
  		log_ids: LID_DEFAULT
  		log_ids: LID_RADIO
  		log_ids: LID_EVENTS
  		log_ids: LID_SYSTEM
  		log_ids: LID_CRASH
  		log_ids: LID_STATS
  		log_ids: LID_SECURITY
  		log_ids: LID_KERNEL
      }
    }
  }
  
  data_sources {
    config {
      name: "android.heapprofd"
      heapprofd_config {
        sampling_interval_bytes: 4096
        shmem_size_bytes: 8388608
        block_client: true
        all_heaps: false
      }
    }
  }
  
  data_sources {
    config {
      name: "android.java_hprof"
      java_hprof_config {
      }
    }
  }
  
  data_sources {
    config {
      name: "linux.ftrace"
      ftrace_config {
        ftrace_events: "sched/sched_switch"
        ftrace_events: "sched/sched_wakeup"
  	  ftrace_events: "sched/sched_wakeup_new"
  	  ftrace_events: "sched/sched_waking"
  	  ftrace_events: "sched/sched_process_exit"
        ftrace_events: "sched/sched_process_free"
  	  ftrace_events: "sched/sched_blocked_reason"
  	  ftrace_events: "sched/sched_find_best_target"
  	  ftrace_events: "sched/sched_migrate_task"
  	  ftrace_events: "sched/sched_task_util"
  	  ftrace_events: "sched/sched_isolate"
  	  ftrace_events: "power/cpu_frequency"
  	  ftrace_events: "power/cpu_frequency_limits"
        ftrace_events: "power/cpu_idle"
  	  ftrace_events: "power/gpu_frequency"
  	  ftrace_events: "power/suspend_resume"
        ftrace_events: "task/task_newtask"
        ftrace_events: "task/task_rename"
  	  ftrace_events: "power/sugov_next_freq"
  	  ftrace_events: "power/sugov_util_update"
        ftrace_events: "thermal"
  	  ftrace_events: "lock"
  	  ftrace_events: "lowmemorykiller/lowmemory_kill"
        ftrace_events: "oom/oom_score_adj_update"
  	  atrace_categories: "gfx"
  	  atrace_categories: "input"
  	  atrace_categories: "view"
  	  atrace_categories: "wm"
  	  atrace_categories: "am"
  	  atrace_categories: "ss"
  	  atrace_categories: "power"
  	  atrace_categories: "dalvik"
  	  atrace_categories: "res"
  	  atrace_categories: "camera"
  	  atrace_categories: "hal"
  	  atrace_categories: "irq"
  	  atrace_categories: "bionic"
  	  atrace_categories: "binder_driver"
  	  atrace_categories: "binder_lock"
  	  atrace_categories: "aidl"
        atrace_apps: "lmkd"
        symbolize_ksyms: true
        disable_generic_events: true
      }
    }
  }
  
  
  duration_ms: 30000
  write_into_file: true
  file_write_period_ms: 200
  max_file_size_bytes: 1000000000
  flush_period_ms: 3000
  ```

- 新建bat脚本

  ```
  @echo off
  adb devices
  
  adb root 
  adb remount
  
  adb shell setprop persist.traced.enable 1
  adb shell "echo 0 > /sys/kernel/tracing/tracing_on"
  
  adb shell "am trace-ipc start"
  for /F "tokens=1,2,3 delims=-:./\ " %%i in ("%DATE%") do SET F1=%%i%%j%%k
  for /F "tokens=1,2,3 delims=-:./\ " %%i in ("%TIME%") do SET F2=%%i.%%j.%%k
  
  set CURRENT_DATE=%F1%%F2%%
  
  adb push ./config.txt /data/local/tmp/config.txt
  adb shell "cat /data/local/tmp/config.txt | perfetto --txt -c - --out /data/misc/perfetto-traces/trace_%CURRENT_DATE%.pftrace"
  
  adb pull /data/misc/perfetto-traces/trace_%CURRENT_DATE%.pftrace
  ```

抓到的trace直接拖到网站打开：https://ui.perfetto.dev/



## python解析

```
from perfetto.trace_processor import TraceProcessor,TraceProcessorConfig

# 加载 trace 文件
# bin_path可下载trace_processor_shell.exe来指定，不指定会自动下载
tp = TraceProcessor(trace=‘trace.perfetto-trace’ , config= TraceProcessorConfig(bin_path=‘’))

# 查询数据
query = """查询语句"""
it = tp.query(query)
for row in it:
    print(row.ts, row.dur, row.name, row.track_id)

# 或者转换为 Pandas DataFrame
df = tp.query(query).as_pandas_dataframe()
print(df.head())

# 关闭处理器
tp.close()

######query语句的例子##############
SELECT
  thread.name AS thread_name,
  SUM(sched.dur) / 1e6 AS total_cpu_time_ms,
  COUNT(*) AS schedule_count,
  SUM(sched.dur) / 1e6 / (MAX(sched.ts + sched.dur) - MIN(sched.ts)) * 1e9 AS cpu_usage_percentage
FROM sched
JOIN thread ON sched.utid = thread.utid
JOIN process ON thread.upid = process.upid
WHERE process.name = '你的进程名'  -- 替换为你要查询的进程名
GROUP BY thread.name
ORDER BY total_cpu_time_ms DESC;
```

待后续更新完善。。。Google_CTS快速调试
