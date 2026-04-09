> Synchronized锁，一个由JVM级别的Java锁工具
> 

## 或许你从未这么清晰地认知Synchronized锁

![Untitled](JUC%E6%8A%80%E6%9C%AF%E7%AF%87(%E4%BA%94)%EF%BC%9ASynchronized%E9%94%81/Untitled.jpeg)

或许你从未注意`Synchronized`锁属于排它锁，所以在使用`Synchronized`锁的时候，一把锁只能同时被一个线程获取，没有获得锁的线程只能等待，这种排它锁本质上就是一种悲观锁；对于`Synchronized`锁而言，每个实例都对应有自己的一把锁`(this)`,不同实例之间互不影响；例外：锁对象是`*.class`以及`synchronized`修饰的是`static`方法的时候，所有对象公用同一把锁，由于`synchronized`锁是`JVM`层面的锁，所以开发者无需手动关注锁的获取与释放，`JVM`会自动管理锁的获取与释放，其原理也是因为`synchronized`关键字修饰的代码，实现机理体现在`javac`编译后的字节码中，字节码的`Header`头信息，存在一块`MarkWord`标记，该标记会记录`synchronized`的锁信息，因此使用`synchronized`修饰的方法，无论方法正常执行完毕还是抛出异常，都会释放锁。

### 一、synchronized锁的本质

1. **你知道为什么Java编码中，你在使用`Synchronized`锁的时候，完全不需要手动`try-catch`来捕获异常并且不需要手动获取释放锁吗？**
    
    我来告诉你为什么：因为Synchronized锁是JVM层面的锁，Synchronized锁是由JVM直接管理的，他是通过字节码对象头的MarkWord进行标记的，jvm会自动取管理锁的获取与释放，不需要开发者自己手动获取释放。synchronized修饰的方法，无论方法正常执行完毕还是抛出异常，都会释放锁。
    

1. **Synchronized锁他有多种形式，但是万变不离其宗~**
    
    （1）实例方法：使用 `synchronized` 关键字修饰实例方法时，会对当前对象实例加锁。只有获得了当前对象实例的锁，才能执行该方法。其他线程需要等待当前线程释放锁才能执行该方法。下面是一个使用对象锁的示例：
    

```java
public class MyClass {
    public synchronized void myMethod() {
        // 代码逻辑
    }
}
```

（2）静态方法：使用 `synchronized` 关键字修饰静态方法时，会对当前类加锁。只有获得了当前类的锁，才能执行该静态方法。其他线程需要等待当前线程释放锁才能执行该静态方法。下面是一个使用类锁的示例：

```java
public class MyClass {
    public static synchronized void myStaticMethod() {
        // 代码逻辑
    }
}
```

（3）代码块：使用 `synchronized` 关键字修饰代码块时，需要指定一个对象作为锁。只有获得了该对象的锁，才能执行该代码块。其他线程需要等待当前线程释放锁才能执行该代码块。下面是一个使用对象锁的代码块示例：

```java
public class MyClass {
    private final Object lock = new Object();

    public void myMethod() {
        synchronized (lock) {
            // 代码逻辑
        }
    }
}
```

（4）类锁：使用 `synchronized` 关键字修饰 `Class` 对象时，会对当前类加锁。只有获得了当前类的锁，才能执行被锁定的代码块。其他线程需要等待当前线程释放锁才能执行被锁定的代码块。下面是一个使用类锁的代码块示例：

```java
public class MyClass {
    public void myMethod() {
        synchronized (MyClass.class) {
            // 代码逻辑
        }
    }
}
```

乍一看`Synchronized`锁有多种多样的用法，其实就两种类型：

`synchronized`修饰的非静态成员方法与代码块的时候，每个实例对象都对应有自己的一把锁(this),不同实例之间互不影响；`synchronized`修饰的是静态成员方法或者类对象的时候，所有实例对象公用同一把锁。

1. **Synchronized锁的本质是什么，其实逆向思维早就告诉你了！**
    
    要想知道锁的本质是什么，只需要看锁的作用是什么。使用锁的目的是为了保证多线程之间对共享资源的访问的原子性和可见性，避免出现并发问题。要想实现这种方式，本质上就是需要协调两个线程之间的关系，让线程在操作共享资源的时候，做一些前置后置操作等等。比如，在对共享资源做写入操作的时候，先执行前置操作，看看当前有无线程操作该资源对吧，如果说有线程占用，你需要标记一下状态为已占用，再不然就是未占用，对吧，可以用0或者1来表示，然后对于是哪一个线程在占用，你需要使用一些标记来记录占用的线程，比如说线程id信息等，对吧，再就是获取这个锁可能会存在多个线程，存在一个线程队列对吧，这个队列的所有线程都会操作这个锁，所以你还有可能需要存储这个线程队列信息，等等。所以说，锁的本质是什么，锁需要具备这些基本属性信息，Java中万物皆是对象，所以锁就是一个对象。他是一个拥有一些特定属性的对象。
    

### 二、synchronized锁的原理

其实这里涉及到源码层面的解读以及字节码的理解，需要反编译看monitor指令。

1. 加锁解锁与可重入**原理：**
    
    将这段代码使用命令`javac SynchronizedDemo2.java`进行编译之后，在使用`javap -verbose SynchronizedDemo2.class`javap命令反编译查看.class文件的信息
    

```java
public class SynchronizedDemo2 {

    Object object = new Object();
    public void method1() {
        synchronized (object) {

        }
        method2();
    }

    private static void method2() {

    }
}
```

编译结果如下：

![Untitled](JUC%E6%8A%80%E6%9C%AF%E7%AF%87(%E4%BA%94)%EF%BC%9ASynchronized%E9%94%81/Untitled.png)

Synchronized锁，从概念上去理解它又是一种可重入锁，如何体现这一可重入特点呢，在字节码层面就可以完美地体现出来，本质就是看monitor标记计数器。`monitorenter`计数器+1，`monitorexit`计数器-1。正是因为Monitor标记计数器，会记录每次monitorEnter与MonitorExit的数量，因此，也可以看出，加锁释放锁的本质就是根据MMonitor的指令数量来判断的。这就是Synchronized的重入性，即在**同一锁程**中，每个对象拥有一个monitor计数器，当线程获取该对象锁后，monitor计数器就会加一，释放锁后就会将monitor计数器减一，线程不需要再次获取同一把锁

每一个对象在同一时间只与一个monitor(锁)相关联，而一个monitor在同一时间只能被一个线程获得，一个对象在尝试获得与这个对象相关联的Monitor锁的所有权的时候，monitorenter指令会发生如下3中情况之一：

• monitor计数器为0，意味着目前还没有被获得，那这个线程就会立刻获得然后把锁计数器+1，一旦+1，别的线程再想获取，就需要等待；

• 如果这个monitor已经拿到了这个锁的所有权，又重入了这把锁，那锁计数器就会累加，变成2，并且随着重入的次数，会一直累加；

• 这把锁已经被别的线程获取了，等待锁释放；

1. Synchronized**可见性原理：**
    
    Synchronized的happens-before规则，即监视器锁规则：**对同一个监视器的解锁，happens-before于对该监视器的加锁**。继续来看代码：
    

```java
public class MonitorDemo {
    private int a = 0;

    public synchronized void writer() {     // 1
        a++;                                // 2
    }                                       // 3

    public synchronized void reader() {    // 4
        int i = a;                         // 5
    }                                      // 6
}
```

该代码的happens-before关系如图所示：

![Untitled](JUC%E6%8A%80%E6%9C%AF%E7%AF%87(%E4%BA%94)%EF%BC%9ASynchronized%E9%94%81/Untitled%201.png)

在图中每一个箭头连接的两个节点就代表之间的happens-before关系，黑色的是通过程序顺序规则推导出来，红色的为监视器锁规则推导而出：线程A释放锁happens-before线程B加锁，蓝色的则是通过程序顺序规则和监视器锁规则推测出来happens-befor关系，通过传递性规则进一步推导的happens-before关系。现在我们来重点关注2 happens-before 5，通过这个关系我们可以得出什么?

根据happens-before的定义中的一条:如果A happens-before B，则A的执行结果对B可见，并且A的执行顺序先于B。线程A先对共享变量A进行加一，由2 happens-before 5关系可知线程A的执行结果对线程B可见即线程B所读取到的a的值为1。

1. **JVM对Synchronized锁的优化**
    
    简单来说在JVM中monitorenter和monitorexit字节码依赖于底层的操作系统的Mutex Lock来实现的，但是由于使用Mutex Lock需要将当前线程挂起并从用户态切换到内核态来执行，这种切换的代价是非常昂贵的；然而在现实中的大部分情况下，同步方法是运行在单线程环境(无锁竞争环境)如果每次都调用Mutex Lock那么将严重的影响程序的性能。**不过在jdk1.6中对锁的实现引入了大量的优化，如锁粗化(Lock Coarsening)、锁消除(Lock Elimination)、轻量级锁(Lightweight Locking)、偏向锁(Biased Locking)、适应性自旋(Adaptive Spinning)等技术来减少锁操作的开销。**
    

1. **Synchronized锁的缺陷**
- `效率低：`锁的释放情况少，只有代码执行完毕或者异常结束才会释放锁；试图获取锁的时候不能设定超时，不能中断一个正在使用锁的线程，相对而言，Lock可以中断和设置超时
- `不够灵活：`加锁和释放的时机单一，每个锁仅有一个单一的条件(某个对象)，相对而言，读写锁更加灵活
- `无法知道是否成功获得锁：`相对而言，Lock可以拿到状态，如果成功获取锁，....，如果获取失败，.....

致谢：

<aside>
💡 有关Synchronized锁的问题，欢迎您在底部评论区留言，一起交流~

</aside>