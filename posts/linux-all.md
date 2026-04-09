> 本文主要介绍学习过程中不可避免的Linux相关的技术知识，记录一下，方便以后自己体系地学习(学习主要来自AI)
> 

# 一、Linux相关基础知识点

推荐阅读相关Linux内核介绍与知识文档

[elixir.bootlin.com](https://elixir.bootlin.com/linux/v2.6.25/source/Documentation/scheduler/sched-design-CFS.txt#L82)提供了很多其他的Liniux内核相关知识供查阅；

Eg：[Linux内核中完全公平调度器（Completely Fair Scheduler, CFS）](https://elixir.bootlin.com/linux/v2.6.25/source/Documentation/scheduler/sched-design-CFS.txt#L82)

## 1.1 技术关键词

### 1.1.1 HZ

在Linux内核中，`HZ` 是一个重要的时钟相关的宏定义，它代表系统的时钟频率，即每秒钟的时钟滴答（ticks）数。换句话说，`HZ` 定义了系统定时器中断的频率。例如，如果 `HZ` 设置为 1000，那么就意味着系统每秒发生1000次定时器中断，或者说每次中断之间的间隔是1毫秒。

时间片（time slice 或 timeslice）是指分配给进程执行的时间长度。在较老的Linux内核版本中，时间片的长度与 `HZ` 直接相关，因为调度器会基于时钟滴答来决定什么时候应该抢占当前运行的进程，并选择下一个要运行的进程。因此，在这种情况下，可以说时间片是 `HZ` 的倒数，即每个时钟滴答对应的时间长度。

然而，从2.6版本开始，Linux引入了一个完全公平的调度器（Completely Fair Scheduler, CFS），它不再依赖固定的时钟滴答来实现进程调度。CFS使用了一种更加精细和动态的方法来管理时间片，允许更灵活和高效的进程调度，而不直接依赖于 `HZ` 的值。这意味着时间片的长度不再简单地等于 `HZ` 的倒数，而是根据系统负载、进程优先级等因素动态调整

### 1.1.2 时钟

Linux的时钟系统是操作系统用来跟踪时间、管理定时器和调度事件的关键组件。它包含了多个不同的概念和机制，每个都有其特定的目的和使用场景。

- **硬件时钟（RTC - Real Time Clock）**

硬件时钟，也称为实时时钟或CMOS时钟，是在计算机主板上的一个物理设备，通常由电池供电，即使在系统关闭的情况下也能保持运行。它用于记录当前的日期和时间，并且在系统启动时初始化内核时钟。

- **软件时钟（System Time）**

软件时钟是由Linux内核维护的时间，它是从系统启动以来经过的时间加上硬件时钟提供的起始时间计算得出的。这个时间被表示为自纪元（1970年1月1日午夜UTC）以来的秒数。软件时钟是通过内核中的定时器中断定期更新的。

- **jiffies**

`jiffies` 是一个全局变量，代表了自系统启动以来发生的时钟滴答（ticks）数。每个时钟滴答的时间间隔由 `HZ` 宏定义决定，`HZ` 表示每秒钟的时钟滴答数。尽管 `jiffies` 在较老的Linux版本中被广泛使用，但在现代Linux内核中，它主要用于向后兼容，而高分辨率定时器和其他更精确的时间管理机制已经被引入。

- **高分辨率定时器（High-Resolution Timers, HRT）**

高分辨率定时器提供了一种方法来创建具有微秒级精度的定时器，它们不依赖于传统的基于 `HZ` 的时钟滴答。HRT允许Linux内核支持更加精细的时间管理和调度，这对于需要高精度计时的应用程序非常重要。

- **POSIX时钟（POSIX clocks）**

Linux实现了POSIX标准中定义的几种时钟接口，例如：

- `CLOCK_REALTIME`：表示当前的系统时间，可以被设置。
- `CLOCK_MONOTONIC`：表示自某个未指定起点以来的单调递增时间，不受系统时间调整的影响。
- `CLOCK_PROCESS_CPUTIME_ID` 和 `CLOCK_THREAD_CPUTIME_ID`：分别表示进程和线程消耗的CPU时间。

这些时钟可以通过`clock_gettime()`等函数访问，提供了对不同时间测量需求的支持。

- **NTP（Network Time Protocol）**

NTP是用来同步计算机时钟的服务协议。Linux系统通常会有一个NTP客户端（如ntpd、chronyd），它能够根据网络上的一台或多台NTP服务器来调整本地时钟，确保与互联网标准时间的一致性。

# 参考文章

暂无

<aside>
💡 有关Linux相关的问题，欢迎您在底部评论区留言，一起交流~

</aside>