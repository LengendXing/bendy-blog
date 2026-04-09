# 原子操作的方案渐进

- 什么是原子操作？
- 为什么需要原子操作？
- 什么是线程安全？
- 如何实现线程安全？
- 什么是死锁？
- 如何避免死锁？
- 有锁安全与无锁线程安全?

## 一、CAS

### 1.1 CAS基本释义

每一个 CAS 操作过程都包含三个运算符： 一个内存地址 V，一个期望的值 A 和一 个新值 B，操作的时候如果这个地址上存放的值等于这个期望的值 A，则将地址上的值赋为新值 B，否则不做任何操作。CAS 的基本思路就是， 如果这个地址上的值和期望的值相等， 则给其赋予新值， 否则不做任何
事儿，但是要返回原值是多少。 自然 CAS 操作执行完成时， 在 业务上不一定完成了， 这个时候我
们就会对 CAS 操作进行反复重试， 于是就有了 循环 CAS。很明显， 循环 CAS 就是在一个循环里不
断的做 cas 操作， 直到成功为止。 Java 中的 Atomic 系列的原子操作类的实现则是利用了循环 CAS
来实现。

### 1.2 CAS会存在三大问题

1. ABA 问题
因为 CAS 需要在操作值的时候， 检查值有没有发生变化， 如果没有发生变化 则更新，但是如果
一个值原来是 A，变成了 B，又变成了 A，那么使用 CAS 进行 检查时会发现它的值没有发生变化，但是实际上却变化了。ABA 问题的解决思路就是使用版本号。在变量前面追加上版本号， 每次变量 更新的时候把版本号加 1，那么 A →B →A 就会变成 1A →2B →3A。举个通俗点的 例子， 你倒了一杯水放桌子上， 干了点别的事， 然后同事把你水喝了又给你重新 倒了一杯水， 你回来看水还在， 拿起来就喝， 如果你不管水中间被人喝过， 只关 心水还在，这就是 ABA 问题。
2. 循环时间长开销大
自旋 CAS 如果长时间不成功，会给 CPU 带来非常大的执行开销。因为如果长时间自旋，就是获取到了时间片但是没有做任何事。
3. 只能保证一个共享变量的原子操作
当对一个共享变量执行操作时， 我们可以使用循环 CAS 的方式来保证原子操作，但是对多个共
享变量操作时，循环 CAS 就无法保证操作的原子性， 这个时候 就可以用锁。还有一个取巧的办法， 就是把多个共享变量合并成一个共享变量来操作。比 如，有两个共享变量i ＝2，j=a，合并一下 ij=2a，然后用 CAS 来操作 ij。从 Java 1.5 开始， JDK 提供了 AtomicReference 类来保证引用对象之间的原子性，就可以把 多个变量放在一个对象里来进行 CAS 操作。

### 1.3 CAS在JDK中的实际应用

1. Atomic原子基础类
AtomicIntegerArray整形数组原子类，AtomicInteger整形原子类属于基本类型，只能更新一个变量。如果需要更新多个变量可以考虑使用原子更新引用类型AtomicReference。但是这种也是存在ABA问题的，如果想处理ABA问题，那么可以使用AtomicStampedReference或者是AtomicMarkableReference原子类，前者利用版本戳的形式记录了每次改变以后的版本号，后者携带一个布尔类型的标记位。
2. Atomic原子更新字段类
如果需原子地更新某个类里的某个字段时，就需要使用原子更新字段类， Atomic 包提供了以下 3个类进行原子字段更新。要想原子地更新字段类需要两步。第一步，因为原子更新字段类都是抽象类， 每次使用的时候必须使用静态方法 newUpdater()创建一个更新器， 并且需要设置 想要更新的类和属性。第二步，更新类的字段（属性）必须使用 public volatile 修饰符，这是为什么呢？其实很容易理解，因为使用CAS操作时，必须保证当CAS成功时，变量的写操作对**所有线程可见**。若字段未被volatile修饰，则无法确保这一点。写入线程的volatile写 → 读取线程的volatile读 

![image.png](JUC%E6%A0%B8%E5%BF%83%E7%AF%87(%E5%9B%9B)%EF%BC%9ACAS%E4%B8%8EAQS/image.png)

除了上面所说的引用类型字段类的更新还有AtomicIntegerFieldUpdater整形字段原子更新类，还有长整形原子字段更新类AtomicLongFieldUpdater。

### 1.4 CAS升级版原子类：LongAdder、LongAccumulator、DoubleAdder、DoubleAccumulator

1. 为什么整形Adder只有LongAdder没有IntegerAdder？同理，为什么浮点型没有FloatAdder只有DoubleAdder？
在Java中，`LongAdder`的设计主要是为了解决高并发场景下频繁写入的计数器性能问题，我知道你可能跟我一样，想知道为什么只有一个LongAdder却没有IntegerAdder，我通过翻阅资料，查到了一些潜在的可能性，首先是数值范围方面，相对于Integer，Long**更适合高并发计数器，**因为Long的数值范围更大（64位），能容纳更大的值，避免在高并发场景下快速溢出，而Integer在极端情况下可能很快溢出，限制了其在高吞吐场景中的实用性。再就是**分段累加（Cell分散竞争）思想，**`LongAdder`通过内部维护多个`Cell`（分段），将竞争分散到不同的内存位置，从而减少线程冲突。这种设计在写入频繁的场景下显著优于`AtomicLong`。如果为`int`实现类似的`IntegerAdder`，其优化效果可能不如`LongAdder`明显。因为`int`的操作本身更快（32位运算），且内存占用更小，分段优化的收益可能无法覆盖额外的内存和复杂度成本。
2. 使用场景：LongAdder与LongAccumulator简单使用

```java
 /**
 * 统计各服务节点的错误日志数量 
 */
public class ErrorLogMonitor {
    private final LongAdder errorCount = new LongAdder();
    
    // 日志收集器上报错误 
    public void reportError() {
        errorCount.add(1); 
    }
    
    // 定时生成汇总报告（每5分钟）
    public void generateReport() {
        long totalErrors = errorCount.sumThenReset();   // 获取并重置计数器 
        System.out.println("[Report]  Past 5mins Error Count: " + totalErrors);
    }
}
```

```java

/**
 * 实时温度监控系统
 */
public class TemperatureMonitor {
    // 定义聚合器：跟踪最高温度、最低温度、平均值 
    private final LongAccumulator maxTemp = 
        new LongAccumulator(Math::max, -100); // 初始-100°C 
 
    private final LongAccumulator minTemp = 
        new LongAccumulator(Math::min, 1000); // 初始1000°C 
 
    private final LongAccumulator sumTemp = 
        new LongAccumulator(Long::sum, 0); 
 
    private final LongAdder count = new LongAdder();
 
    // 上报温度数据 
    public void reportTemperature(long temp) {
        maxTemp.accumulate(temp); 
        minTemp.accumulate(temp); 
        sumTemp.accumulate(temp); 
        count.increment(); 
    }
 
    // 生成监控报告 
    public void printReport() {
        System.out.println("====  温度报告 ====");
        System.out.println(" 最高温度: " + maxTemp.get()  + "°C");
        System.out.println(" 最低温度: " + minTemp.get()  + "°C");
        System.out.println(" 平均温度: " + (sumTemp.get()  / count.longValue())  + "°C");
    }
}
```

## 二、AQS

Java并发工具类中，大部分的都是基于AQS去实现的。AQS是`AbstractQueuedSynchronizer`类的缩写，它代表的是一种规范。AQS的设计思想，源自计算机管程结构，管程是一种程序结构，是一种方法论，他在计算机中还有一个很常见的名字，叫监视器。科班出身的同学应该非常熟悉，管程一般指的就是操作系统中的Monitor，我们一直都在于Monitor打交道，java中的Monitor锁是不是很熟悉，就是监视器锁，Synchronized锁底层不就是基于Monitor锁来实现的吗。管程核心方法论在于如何实现在一个时间点，最多只有一个[线程](https://zh.wikipedia.org/wiki/%E7%BA%BF%E7%A8%8B)在执行管程的某个[子程序](https://zh.wikipedia.org/wiki/%E5%AD%90%E7%A8%8B%E5%BA%8F)。根据这一方法论，有不同的实现策略，Java正是基于某一种策略实现的AQS。

再回过头来看，实际上并发问题的无非就是解决两大问题：一是互斥问题：如何保证线程之间操作的原子性，也就是同一个时刻只允许一个线程访问共享资源。二是同步问题：如何保证线程之间通信,协作。在管程的发展史上，先后出现过以下三种不同的管程模型

- MESA模型
- Hoare模型
- Hasen模型

而我们现在讨论的Java正是基于MESA模型实现的。

这里引用一下ProcessOn的公开模板库中一款对于MESA介绍的图片：源自[这里](https://www.processon.com/view/6471ba861fcd894b02a04f8b)

![image.png](JUC%E6%A0%B8%E5%BF%83%E7%AF%87(%E5%9B%9B)%EF%BC%9ACAS%E4%B8%8EAQS/image%201.png)

### **1.1 MESA模型 的核心思想**

> 图片来自[CSDN博客](https://blog.csdn.net/weixin_44611567/article/details/113738372)作者：球小爷原创
> 

![image.png](JUC%E6%A0%B8%E5%BF%83%E7%AF%87(%E5%9B%9B)%EF%BC%9ACAS%E4%B8%8EAQS/image%202.png)

1. **互斥访问**：管程内部有一个互斥锁（Monitor Lock），同一时间只能有一个线程执行管程内的代码（临界区）。
2. **条件变量**：线程在进入管程后，若无法满足继续执行的条件（如资源不足），会主动挂起（yield），并进入等待队列。
3. **阻塞与唤醒**：
    - **阻塞（Block）**：当线程无法继续执行时，释放管程锁，将自己加入对应的条件变量的等待队列。
    - **唤醒（Signal）**：当线程完成某个操作后，调用 `signal` 方法，唤醒等待队列中的一个线程。

---

### **1.2 MESA 的工作流程**

1. **进入管程**：
    - 线程尝试获取管程锁。
    - 若成功，执行临界区代码；若失败，进入等待队列并阻塞。
2. **条件等待**：
    - 在临界区内，若需要等待某个条件（如 `count > 0`），调用 `wait` 方法：
        
        ```c
        wait(condition);// 释放锁，加入条件变量的等待队列
        ```
        
    - 线程被阻塞，直到其他线程通过 `signal` 唤醒它。
3. **唤醒操作**：
    - 当条件满足时，调用 `signal` 方法：
        
        ```c
        signal(condition);// 唤醒等待队列中的一个线程
        ```
        
    - 被唤醒的线程重新竞争管程锁，若成功则继续执行。

### 1.3 源码解读AQS模型

JDK8中体现出来的公平锁与非公平锁的核心区别：底层调用的时候，非公平再进入sync的lock方法的时候，会先进行一次cas，如果失败，才会进入acquire队列，如果成功就相当于没有排队了，直接获取到的刚好释放的锁了。而公平锁，则会优先acquire。回去看当前线程是不是独占线程，这是重入锁机制，会持续累加state。如下图ReentrantLock独占式锁源码所示：

![](https://img20.360buyimg.com/openfeedback/jfs/t1/256462/15/23530/211453/67b86c31Fcdd65af8/741cb9cdfd4a9e67.png)

其中AQS底层核心的CAS操作，是基于Unsafe类去实现的：

![](https://img20.360buyimg.com/openfeedback/jfs/t1/256413/14/24005/23387/67b97f05F87a1ff1b/3bcf001b29534e72.png)

此外，AQS源码注释中也提到，条件队列仅在独占模式下被访问。

AQS的这段懒加载其实写的非常好，结合上面注释可以得知，CLH队列不会构造对象的时候创建头节点，只会在存在首次竞争时候才会进行初始化逻辑。之后在通过CAS操作将当前函数传入的节点设置为tail尾部节点，相当于尾插，最后将header的next位置赋值尾节点的内存地址。

```java
// JDK8源码中的AQS框架的enq方法
private Node enq(final Node node) {
    for (;;) { // 无限循环，直到插入成功
        Node t = tail;        // 获取当前队尾节点
        if (t == null) {      // 队列未初始化
            // 尝试创建头节点并设置head
            if (compareAndSetHead(new Node())) {
                tail = head;   // 初始化tail指向head
            }
        } else {
            node.prev = t;     // 新节点的前驱设为当前尾节点
            // 原子性地将当前尾节点的next指向新节点，并更新tail
            if (compareAndSetTail(t, node)) {
                t.next = node;  // 完成链表连接
                return t;      // 返回原尾节点
            }
        }
    }
}
```

此外，在添加等待线程的时候，它也会间接使用到懒加载

```java
private Node addWaiter(Node mode) {
    Node node = new Node(Thread.currentThread(), mode); // 创建新节点
    Node pred = tail; // 获取当前尾节点
    if (pred != null) { // 队列非空时的快速路径
        node.prev = pred; // 新节点的前驱设为当前尾节点
        if (compareAndSetTail(pred, node)) { // 原子性更新尾节点
            pred.next = node; // 连接前驱和后继
            return node; // 插入成功，返回新节点
        }
    }
    enq(node); // 处理队列为空或快速路径失败的情况
    return node;
}
```

之后是唤醒线程的核心操作：这里会进行判断waitValue，这个value是在Node中定义的四种状态，先将将要唤醒的线程状态通过CAS操作清除，然后如果当前节点没有后继节点，说明是空链表或者存在链表断裂的情况，因此当直接的后继无效时，必须从队尾反向扫描，直到找到第一个有效的节点（`waitStatus <= 0`）。为什么要从尾部开始寻找，因为节点的 `next` 指针可能在并发操作中被修改（例如，后续节点已被取消并被移出队列），正向遍历可能失效。可以发现，AQS底层挂起线程是通过LockSupport来实现的，底层调用的也是JVM层面的unpark函数，下文会讲一些扩展。注意，反向扫描可能因节点状态频繁变化而失效，但 AQS 通过 CAS 和状态检查机制规避了这一问题。这里的唤醒，是为了唤醒 线程，使其重新竞争锁。

![image.png](JUC%E6%A0%B8%E5%BF%83%E7%AF%87(%E5%9B%9B)%EF%BC%9ACAS%E4%B8%8EAQS/image%203.png)

```java

private void unparkSuccessor(Node node) {
    // 1. 尝试清除节点的负面状态（如 SIGNAL）
    int ws = node.waitStatus;
    if (ws < 0)
        compareAndSetWaitStatus(node, ws, 0);

    // 2. 寻找有效的后继节点 s
    Node s = node.next;
    if (s == null || s.waitStatus > 0) {
        s = null;
        // 从队尾向前遍历，找到第一个有效节点
        for (Node t = tail; t != null && t != node; t = t.prev) {
            if (t.waitStatus <= 0) {
                s = t;
                break;
            }
        }
    }
    // 3. 唤醒有效节点
    if (s != null)
        LockSupport.unpark(s.thread);
}
```

**扩展：**

> 简单记录一下，LockSupport底层的unpark函数是如何实现的：
> 

以 HotSpot 为例，`unpark` 的底层流程如下：

1. **检查目标线程是否被阻塞**：如果目标线程当前处于 `BLOCKED` 或 `WAITING` 状态，则尝试将其标记为可运行。
2. **更新线程状态**：在 TCB（每个线程在 JVM 内部都有一个对应的 **线程控制块（Thread Control Block, TCB）**，其中包含线程的状态、优先级等信息。`unpark` 操作会修改 TCB 中的标志位，将线程状态从阻塞恢复为可调度） 中将线程状态设置为 `RUNNABLE`，并清除阻塞原因。
3. **插入就绪队列**：将线程加入操作系统的就绪队列（Ready Queue），使其有机会被 CPU 调度。
4. **触发调度**：提醒操作系统进行上下文切换，尽快调度被唤醒的线程。

不同的 JVM 实现（如 HotSpot、OpenJDK）会通过操作系统原语（如 POSIX 的 `pthread_cond_signal` 或 Windows 的 `ResumeThread`）通知操作系统唤醒目标线程。例如：

- **Linux/x86**：使用 `futex`（快速用户空间互斥）机制，通过 `syscall` 触发内核的线程调度。
- **Windows**：调用 `NtResumeThread` 函数恢复线程执行。

---

**JDK17中公平锁与非公平锁的核心区别：**

从JDK8之后，由于JDK 8 引入的偏向锁在存在大量短生命周期锁时性能优异，但当锁被反复抢占时，会退化为重量级锁并带来额外开销。JDK9开始，Synchronized的偏向锁被移除，在 **JDK 15** 中被标记为废弃（**JEP 351**），相关优化也被移除。JDK8中，非公平锁会在进入等待队列前执行一次抢锁，如果失败才会进入队列，这种优化 需要内存屏障保证原子性，增加了 CPU 负载，8之后，JDK不在支持这种优化，`ReentrantLock` 不再依赖偏向锁的快速路径 CAS 操作，移除快速路径后，所有锁获取操作统一通过队列进行，减少了内存屏障的使用频率。意味着并发优化进行了改动。JDK17 中 AQS的底层实现也在这次并发优化中做出了一些改进。

![image.png](JUC%E6%A0%B8%E5%BF%83%E7%AF%87(%E5%9B%9B)%EF%BC%9ACAS%E4%B8%8EAQS/image%204.png)

**ReentranReadWriteLock读写锁的引入**

ReentrantLock是AQS独占锁的直接实现，支持公平与非公平锁，但是对于独占锁，同一时间只能有一个线程持有锁，而对于常见的读多写少的业务场景，独占锁不能支撑并发度，因此JUC额外提供了读写场景下的AQS规范锁。读写锁核心实现还是基于AQS，以维护state值作为核心，由于存在读写了两种状态，因此读写锁是通过对变量二进制拆分使用来达到一个变量支持两种状态的，int类型的state本质上是占有四个字节，一个字节占有八位存储，4*8一共占有32位存储，读写锁通过对高16位设置为读锁，低十六位设置为写锁，通过与或逻辑运算，从而达到通过位运算控制读写锁状态，如果state值大于0，但是高十六位按位与结果是0，说明存在写锁，反之则证明存在读锁，读写互斥，读读共享，写锁可以叠加读锁进而保证无缝衔接，相当于是锁降级了，但不是直接降级。

![](https://img20.360buyimg.com/openfeedback/jfs/t1/252863/9/23261/86033/67b97442Ff621ba9f/e6236596744a546d.png)

与ReentrantLock一致的是，他也支持可重入，前面介绍过ReentrantLock，他可重入是通过维护state值来达到的，等于0的时候就是无线程持有锁，对于ReentrantReadWriteLock，他将state拆分高低十六位来区分读写锁，那是怎么支持的锁重入呢？继续看源码就可得知

![](https://img20.360buyimg.com/openfeedback/jfs/t1/266088/36/22985/93519/67b97413F815dc0ab/ce8e536ac8e1ffca.png)

### 总结一下：

乐观读写锁`StampedLock`不支持可重入，先乐观读，读完检测有没有写锁，有再加悲观锁继续读，读最新结果。看下来AQS的锁优缺点都十分明显，如果要讲究效率不考虑锁申请的重复流程，直接CAS是最直接的，但是想缓存一些数据以空间换取并发下的时间，比如设计一些条件队列，等待队列来避免线程重复创建申请锁，那就走AQS这种思路。

## 扩展：linux的Pthread模型

请看后续的专栏文章介绍Linux的P_thread模型，这个模型与锁的唤醒以及等待相关。

未完待续…