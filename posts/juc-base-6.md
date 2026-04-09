> 相比Sychronized(重量级锁)，volatile提供了另一种解决可见性和有序性问题的方案。注意，Volatile无法根本解决原子性问题！
> 

![Untitled](JUC%E6%8A%80%E6%9C%AF%E7%AF%87(%E5%85%AD)%EF%BC%9AVolatile%E5%85%B3%E9%94%AE%E5%AD%97/Untitled.jpeg)

## **带着BAT大厂的面试问题去理解volatile**

- volatile关键字的作用是什么?
- volatile能保证原子性吗?
- 之前32位机器上共享的long和double变量的为什么要用volatile? 现在64位机器上是否也要设置呢?
- i++为什么不能保证原子性?
- volatile是如何实现可见性的? 内存屏障。
- volatile是如何实现有序性的? happens-before等
- 说下volatile的应用场景?

## **一、volatile的作用详解**

### **1、防重排序**

JMM-Java虚拟机模型在不改变正确语义的前提下，会允许编译器和处理器对指令序列进行重排序，而一旦使用Volatile修饰，JMM 会提供内存屏障来阻止编译后的字节码在翻译成机器码的时候的指令重排序。

DCL，双重检查加锁(DCL)的方式来实现并发环境下的单例模式。

```
public class Singleton {

    public static volatile Singleton singleton;
    /**
     * 构造函数私有，禁止外部实例化
     */
    private Singleton() {};
    public static Singleton getInstance() {
        if (singleton == null) {
            synchronized (singleton.class) {
                if (singleton == null) {
                    singleton = new Singleton();
                }
            }
        }
        return singleton;
    }
}
```

实例化一个对象需要三个步骤：

- 分配内存空间
- 初始化对象
- 将内存空间的地址赋值给对应的引用

由于操作系统可以对`指令进行重排序`，所以上面的过程也可能会变成如下过程：

- 分配内存空间
- 将内存空间的地址赋值给对应的引用
- 初始化对象

如果是这个流程，多线程环境下就可能将一个未初始化的对象引用暴露出来，从而导致不可预料的结果，这就造成了**构造方法的溢出**。而Volatile关键字可以让我们禁止底层编译后的代码转译为CPU指令的时候可能出现的JMM对指令重排序。因此，为了防止这个过程的重排序，我们需要将变量设置为volatile类型的变量。另一方面，我们知道JMM为了保证程序的有序性，在JMM中存在着一个happer-Before的概念原则，HappenBefore规则中有一条是 volatile 变量规则，对一个 volatile 域的写，happens-before 于任意后续对这个 volatile 域的读。这里以Pdai的Demo为例：

```
//假设线程A执行writer方法，线程B执行reader方法
class VolatileExample {
    int a = 0;
    volatile boolean flag = false;

    public void writer() {
        a = 1;              // 1 线程A修改共享变量
        flag = true;        // 2 线程A写volatile变量
    }

    public void reader() {
        if (flag) {         // 3 线程B读同一个volatile变量
        int i = a;          // 4 线程B读共享变量
        ……
        }
    }
}
```

根据 happens-before 规则，上面过程会建立 3 类 happens-before 关系：

- 根据程序次序规则：1 happens-before 2 且 3 happens-before 4。
- 根据 volatile 规则：2 happens-before 3。
- 根据 happens-before 的传递性规则：1 happens-before 4。

![](https://sinsyedu.oss-cn-hangzhou.aliyuncs.com/img/java-thread-x-key-volatile-1.png)

因为以上规则，当线程 A 将 volatile 变量 flag 更改为 true 后，线程 B 能够迅速感知。

为了性能优化，JMM 在不改变正确语义的前提下，会允许编译器和处理器对指令序列进行重排序。

JMM 提供了内存屏障阻止这种重排序。Java 编译器会在生成指令系列时在适当的位置会插入内存屏障指令来禁止特定类型的处理器重排序。

JMM 会针对编译器制定 volatile 重排序规则表。

![](https://sinsyedu.oss-cn-hangzhou.aliyuncs.com/img/java-thread-x-key-volatile-2.png)

" NO " 表示禁止重排序。

为了实现 volatile 内存语义时，编译器在生成字节码时，会在指令序列中插入内存屏障来禁止特定类型的处理器重排序。

对于编译器来说，发现一个最优布置来最小化插入屏障的总数几乎是不可能的，为此，JMM 采取了保守的策略。

- 在每个 volatile 写操作的前面插入一个 StoreStore 屏障。
- 在每个 volatile 写操作的后面插入一个 StoreLoad 屏障。
- 在每个 volatile 读操作的后面插入一个 LoadLoad 屏障。
- 在每个 volatile 读操作的后面插入一个 LoadStore 屏障。

volatile 写是在前面和后面分别插入内存屏障，而 volatile 读操作是在后面插入两个内存屏障。

![](https://sinsyedu.oss-cn-hangzhou.aliyuncs.com/img/image-20230712165559782.png)

![](https://sinsyedu.oss-cn-hangzhou.aliyuncs.com/img/java-thread-x-key-volatile-3.png)

### **2、保证可见性**

volatile 变量的内存可见性是基于内存屏障(Memory Barrier)实现的。

可见性问题主要指一个线程修改了共享变量值，而另一个线程却看不到。引起可见性问题的主要原因是每个线程拥有自己的一个高速缓存区——线程工作内存。volatile关键字能有效的解决这个问题，我们看下下面的例子，就可以知道其作用：

```
public class TestVolatile {
    private static boolean stop = false;

    public static void main(String[] args) {
        // Thread-A
        new Thread("Thread A") {
            @Override
            public void run() {
                while (!stop) {
                }
                System.out.println(Thread.currentThread() + " stopped");
            }
        }.start();

        // Thread-main
        try {
            TimeUnit.SECONDS.sleep(1);
            System.out.println(Thread.currentThread() + " after 1 seconds");
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        stop = true;
    }
}
```

**volatile不能保证完全的原子性，只能保证单次的读/写操作具有原子性**。可见性的实现是通过内存屏障实现的，内存屏障在阻止指令重排序之后，会提供lock 前缀的指令，来让操作该对象内存地址的指令先去刷一遍主存。

大厂常问问题：**i++为什么不能保证原子性?**

```
public class VolatileTest01 {
    volatile int i;

    public void addI(){
        i++;
    }

    public static void main(String[] args) throws InterruptedException {
        final  VolatileTest01 test01 = new VolatileTest01();
        for (int n = 0; n < 1000; n++) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Thread.sleep(10);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                    test01.addI();
                }
            }).start();
        }
        Thread.sleep(10000);//等待10秒，保证上面程序执行完成
        System.out.println(test01.i);
    }
}
```

应该能看出，volatile是无法保证原子性的(否则结果应该是1000)。原因也很简单，i++其实是一个复合操作，包括三步骤

- 读取i的值。
- 对i加1。
- 将i的值写回内存。

**volatile是无法保证这三个操作是具有原子性的，我们可以通过AtomicInteger或者Synchronized来保证+1操作的原子性。**

以一段代码来看Volatile关键字：

```
public class Test {
    private volatile int a;
    public void update() {
        a = 1;
    }
    public static void main(String[] args) {
        Test test = new Test();
        test.update();
    }
}
```

通过 hsdis 和 jitwatch 工具可以得到编译后的汇编代码:

```
......
  0x0000000002951563: and    $0xffffffffffffff87,%rdi
  0x0000000002951567: je     0x00000000029515f8
  0x000000000295156d: test   $0x7,%rdi
  0x0000000002951574: jne    0x00000000029515bd
  0x0000000002951576: test   $0x300,%rdi
  0x000000000295157d: jne    0x000000000295159c
  0x000000000295157f: and    $0x37f,%rax
  0x0000000002951586: mov    %rax,%rdi
  0x0000000002951589: or     %r15,%rdi
  0x000000000295158c: lock cmpxchg %rdi,(%rdx)  //在 volatile 修饰的共享变量进行写操作的时候会多出 lock 前缀的指令
  0x0000000002951591: jne    0x0000000002951a15
  0x0000000002951597: jmpq   0x00000000029515f8
  0x000000000295159c: mov    0x8(%rdx),%edi
  0x000000000295159f: shl    $0x3,%rdi
  0x00000000029515a3: mov    0xa8(%rdi),%rdi
  0x00000000029515aa: or     %r15,%rdi
......
```

lock 前缀的指令在多核处理器下会引发两件事情:

- 将当前处理器缓存行的数据写回到系统内存。
- 写回内存的操作会使在其他 CPU 里缓存了该内存地址的数据无效。

这样一来，当CPU与内部缓存数据做交换的时候，他会嗅探在总线上传播的数据来检查自己缓存的值是不是过期了，当处理器发现自己缓存行对应的内存地址被修改，就会将当前处理器的缓存行设置成无效状态，当处理器对这个数据进行修改操作的时候，会重新从系统内存中把数据读到处理器缓存里。所有多核处理器下还会完成：当处理器发现本地缓存失效后，就会从内存中重读该变量数据，即可以获取当前最新值。volatile 变量通过这样的机制就使得每个线程都能获得该变量的最新值。

> volatile关键字引发的思考
> 

volatile关键字是为了保证所修饰的变量当遇到读操作的时候，会直接去内存中去读取最新数据，而是不从高速缓存Cache中读取，因此他主要的作用是保证可见性，我举一个例子，在观察某讲师的视频中提到Synchronized也可以刷新可见性，如下例子：

```java
public class VolatileCase {
    private static boolean ready;
    private static int number;

    private static class PrintThread extends Thread{
        @Override
        public void run() {
            System.out.println("PrintThread is running.......");
            while(!ready){
                //System.out.println("lll");
                // Thread.sleep(1000);
            };//无限循环
            System.out.println("number = "+number);
        }
    }

    public static void main(String[] args) throws InterruptedException {
        new PrintThread().start();
        SleepTools.second(1);
        number = 51;
        ready = true;
        SleepTools.second(5);
        System.out.println("main is ended!");
    }
}
```

这里，while循环中，本应该是用volatile来修饰的时候，才能让子线程看见主线程对其的修改，现在没有volatile变量，只是在循环中加了一个打印或者是睡眠操作，为啥还是能看见呢？讲师说自己查阅了很多资料说不知道，他应该是不确定，担心误导别人，我觉得这种想法还是好的，因为不确定的知识不可胡乱传播，给讲师点赞。

我自己观察了一下，应该还是因为Synchronized锁（monitor锁）。因为Synchronized锁：System.out.println内部使用了synchronized锁，而synchronized块在退出时会释放锁，此时会强制将工作内存中的变量刷新到主内存，同时获取锁时会从主内存重新加载变量。经过我的考察求证，结果如下：这个现象涉及 **Java 内存模型（JMM）** 的可见性机制，而 `volatile` 并不是唯一能触发可见性的操作。

### 3、**`System.out.println` 的隐式同步**

`System.out.println` 内部使用了 **`synchronized` 锁**（源码如下）：

```java
public void println(String x) {
    synchronized (this) {  // 隐式加锁
        print(x);
        newLine();
    }
}
```

• **`synchronized` 的副作用**：当一个线程退出 `synchronized` 块时，会强制将本地内存（工作内存）中的修改刷新到主内存；而进入 `synchronized` 块时，会从主内存重新加载变量。

### 4、Sleep的间接同步

`Thread.sleep` 本身不直接保证内存可见性，但它可能导致 **线程调度器的介入**：

- **线程切换的副作用**：当线程休眠时，CPU 可能会切换到其他线程（如主线程），主线程对 `ready` 的修改有机会被写入主内存。
- **时间窗口的巧合**：休眠期间主线程完成修改，子线程恢复后可能从主内存重新加载变量（但这不是严格保证的）。

总结：这里Sleep导致子线程看见主线程的修改，底层的作用机理其实是借助了线程调度器，在CPU切换线程的时候，主线程的内存有机会同步到主内存，当前我是这么理解的，在还没有求证源码的情况下，这是唯一的潜在可能，因为若干次重复实验，结果仍然是一样的。

<aside>
💡 有关**Volatile**关键字的问题，欢迎您在底部评论区留言，一起交流~

</aside>