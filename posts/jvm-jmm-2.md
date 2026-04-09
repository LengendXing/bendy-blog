> 本文继续从类加载到内存经过验证后介绍JVM后续的详情，本文不断更新中
> 

# JVM底层细节

本文将会从JVM的组成结构、内存分配、内存管理、垃圾回收、字节码相关等细节来阐述JVM。

## 一、内存模型结构

JDK体系结构图

![image.png](%E6%B7%B1%E5%BA%A6%E5%A5%BD%E6%96%87JVM%E7%AC%94%E8%AE%B0%E7%AF%87(%E4%BA%8C)%EF%BC%9AJVM%E5%86%85%E5%AD%98%E7%AE%A1%E7%90%86/image.png)

## 二、内存模型联动细节

![image.png](%E6%B7%B1%E5%BA%A6%E5%A5%BD%E6%96%87JVM%E7%AC%94%E8%AE%B0%E7%AF%87(%E4%BA%8C)%EF%BC%9AJVM%E5%86%85%E5%AD%98%E7%AE%A1%E7%90%86/image%201.png)

## 三、对象内存分配细节

### 3.1 JRE各区域内存分配调节

JVM对运行时数据区各区域的内存分配也是有讲究的。

常见的内存分配是在启动JVM的时候，其实只需稍加留意，一般线上项目，在预执行的Jar程序时候，大多数都会设置一些启动参数，而从这些启动参数中足以窥见一二。

![image.png](%E6%B7%B1%E5%BA%A6%E5%A5%BD%E6%96%87JVM%E7%AC%94%E8%AE%B0%E7%AF%87(%E4%BA%8C)%EF%BC%9AJVM%E5%86%85%E5%AD%98%E7%AE%A1%E7%90%86/image%202.png)

堆空间，设置参数是-Xms与-Xmx。在[JDK8](https://docs.oracle.com/javase/8/docs/technotes/tools/windows/java.html?spm=5176.28103460.0.0.297c5d270zOjNR#BABDJJHI)与[JDK17](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html?spm=5176.28103460.0.0.297c5d270zOjNR)中，垃圾收集的基本概念是基本不变的，还是基于分代收集的思想。JDK17中依旧保留有老年代，年轻代的说法。

方法区，JDK8中，对于方法区的实现是永久代，而JDk17中，对于方法区的实现是元空间。设置参数是-XX:MetaspaceSize与-XX:MaxMetaspaceSize。

虚拟机栈，对于虚拟机栈分配内存时候，如果栈内存分配的越少，对于均摊给每一个栈帧的内存就会更少，每个线程都有自己的栈，内存总量不变下，栈内存减小，可开启的总线程数量会增加。

对象内存分配流程细节

![image.png](%E6%B7%B1%E5%BA%A6%E5%A5%BD%E6%96%87JVM%E7%AC%94%E8%AE%B0%E7%AF%87(%E4%BA%8C)%EF%BC%9AJVM%E5%86%85%E5%AD%98%E7%AE%A1%E7%90%86/image%203.png)

栈上内存分配

Eden伊甸园区内存分配

大对象直接进入老年代

长期存活的对象将进入老年代

对象动态年龄判断

老年代空间分配担保机制

对象创建与内存分配

类元信息：代码组成等类元数据信息是放在方法区的

new对象的时候，会有一个引用指针，从类元信息指向方法区的引用，存放在类元信息的数据是供给JVM内部使用的，而如果OOP想使用类源信息，需要通过获取class对象，而这个class对象是在堆空间中的。

## 四、HotSpot源码操作溯源

## 五、JVM内存管理细节

5.1 类加载：

虚拟机遇到一条new指令时，首先将去检查这个指令的参数是否能在常量池中定位到一个类的符号引用，并且检查这个符号引用代表的类是否已被加载、解析和初始化过。如果没有，那必须先执行相应的类加载过程。

5.2 内存分配

内存划分方法：指针碰撞与空闲列表。

解决内存划分的时候的并发问题：CAS操作；TLAB；

5.3 初始化

5.4 设置对象头

5.5 初始化执行init

5.6 指针压缩

5.7 垃圾回收相关

引用计数算法

可达性分析算法

JDK8遗留问题：Finalize免死问题

## 六、字节码细节剖析

Java-Class文件结构

| flag_name | value | desc |
| --- | --- | --- |
| ACC_PUBLIC | 0x0001 | public修饰符号 |
| ACC_FINAL | 0x0010 | 没有子类 |
| ACC_SUPER | 0x0020 | 通过invokeSpecial指令可以调用父类的方法 |
| ACC_INTERFACE | 0x0200 | 标识是一个接口 |
| ACC_ABSTRACT | 0x0400 | 表示是一个抽象类 |
| ACC_SYNTHETIC | 0x1000 | 该class是动态生成的没有源文件 |
| ACC_ANNOTATION | 0x2000 | 是一个注解类型 |
| ACC_ENUM | 0x4000 | 表示是一个枚举类型 |
| ACC_PRIVATE | 0x0002 | 表示私有的 |

`类的访问权限查询手册`

| flag_name | value | desc |
| --- | --- | --- |
| ACC_PUBLIC | 0x0001 | public修饰符号 |
| ACC_FINAL | 0x0010 | 没有子类 |
| ACC_SUPER | 0x0020 | 通过invokeSpecial指令可以调用父类的方法 |
| ACC_INTERFACE | 0x0200 | 标识是一个接口 |
| ACC_ABSTRACT | 0x0400 | 表示是一个抽象类 |
| ACC_SYNTHETIC | 0x1000 | 该class是动态生成的没有源文件 |
| ACC_ANNOTATION | 0x2000 | 是一个注解类型 |
| ACC_ENUM | 0x4000 | 表示是一个枚举类型 |
| ACC_PRIVATE | 0x0002 | 表示私有的 |

`Field_info 字段表结构`

| 类型 | 名称 | 数量 |
| --- | --- | --- |
| u2 (1个) | access_flag (权限修饰符) | 1 |
| u2 | name_index (字段名称索引) | 1 |
| u2 | descriptor_index (字段描述索引) | 1 |
| u2 | attribute_count (属性表个数) | 1 |

> 参考资料：图灵学院CTAJava架构师第六期系列课程-诸葛、司马
> 

<aside>
💡 有关Java虚拟机的细节问题，欢迎您在底部评论区留言，一起交流~

</aside>