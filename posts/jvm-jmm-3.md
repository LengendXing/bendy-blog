> 本文来自于我收集整理的网络资源：图灵架构CTA架构板第六期课程资料，如果侵犯作者权益联系删除，仅供学习交流
> 

# 字节码指令对照表包含JDK8~JDK17

本文所有内容均来自于我收集整理的网络资源：其中，JDK8字节码指令部分资料来自于我从早年收集的**图灵架构CTA架构板第六期课程资料**，JDK17的字节码指令来自于自己编译提取与网络校对后的，如果有内容侵犯原创作者的权益联系我删除，本文主要目的是为了记录分享技术基础，与更多的优秀开发者一起学习交流！

## 字节码体系结构参考

字节码案例之字节码结构：

![image.png](%E5%AD%97%E8%8A%82%E7%A0%81%E4%B8%8EJVM%E5%B8%B8%E8%A7%81%E6%8C%87%E4%BB%A4/image.png)

如图所示位置：01 00 0F 4C 69 6E 65 4E 75 6D 62 65 72 54 61 62 6C 65

![image.png](%E5%AD%97%E8%8A%82%E7%A0%81%E4%B8%8EJVM%E5%B8%B8%E8%A7%81%E6%8C%87%E4%BB%A4/image%201.png)

此处代表的是行号表，此处位置记录着程序代码执行的行号，这也就是为什么在堆栈信息中根据报错找到目标行号

从字节码结构可以看出：局部变量表操作数栈深度这些信息，是在编译器就可以确认的。为什么构造方法的局部变量数量不是0而是1，因为包含一个this，在构造的时候会将this作为隐式变量传递为局部变量表的第一个参数。

## JDK8：常见JVM指令：栈和局部变量操作

1、将常量压入栈的指令

| 指令 | 描述 |
| --- | --- |
| aconst_null | 将null对象引用压入栈 |
| iconst_m1 | 将int类型常量-1压入栈 |
| iconst_0 | 将int类型常量0压入栈 |
| iconst_1 | 将int类型常量1压入操作数栈 |
| iconst_2 | 将int类型常量2压入栈 |
| iconst_3 | 将int类型常量3压入栈 |
| iconst_4 | 将int类型常量4压入栈 |
| iconst_5 | 将int类型常量5压入栈 |
| lconst_0 | 将long类型常量0压入栈 |
| lconst_1 | 将long类型常量1压入栈 |
| fconst_0 | 将float类型常量0压入栈 |
| fconst_1 | 将float类型常量1压入栈 |
| dconst_0 | 将double类型常量0压入栈 |
| dconst_1 | 将double类型常量1压入栈 |
| bipush | 将一个8位带符号整数压入栈 |
| sipush | 将16位带符号整数压入栈 |
| ldc | 把常量池中的项压入栈 |
| ldc_w | 把常量池中的项压入栈（使用宽索引） |
| ldc2_w | 把常量池中long类型或者double类型的项压入栈（使用宽索引） |

2、从栈中的局部变量中装载值的指令

| 指令 | 描述 |
| --- | --- |
| iload | 从局部变量中装载int类型值 |
| lload | 从局部变量中装载long类型值 |
| fload | 从局部变量中装载float类型值 |
| dload | 从局部变量中装载double类型值 |
| aload | 从局部变量中装载引用类型值（reference） |
| iload_0 | 从局部变量0中装载int类型值 |
| iload_1 | 从局部变量1中装载int类型值 |
| iload_2 | 从局部变量2中装载int类型值 |
| iload_3 | 从局部变量3中装载int类型值 |
| lload_0 | 从局部变量0中装载long类型值 |
| lload_1 | 从局部变量1中装载long类型值 |
| lload_2 | 从局部变量2中装载long类型值 |
| lload_3 | 从局部变量3中装载long类型值 |
| fload_0 | 从局部变量0中装载float类型值 |
| fload_1 | 从局部变量1中装载float类型值 |
| fload_2 | 从局部变量2中装载float类型值 |
| fload_3 | 从局部变量3中装载float类型值 |
| dload_0 | 从局部变量0中装载double类型值 |
| dload_1 | 从局部变量1中装载double类型值 |
| dload_2 | 从局部变量2中装载double类型值 |
| dload_3 | 从局部变量3中装载double类型值 |
| aload_0 | 从局部变量0中装载引用类型值 |
| aload_1 | 从局部变量1中装载引用类型值 |
| aload_2 | 从局部变量2中装载引用类型值 |
| aload_3 | 从局部变量3中装载引用类型值 |
| iaload | 从数组中装载int类型值 |
| laload | 从数组中装载long类型值 |
| faload | 从数组中装载float类型值 |
| daload | 从数组中装载double类型值 |
| aaload | 从数组中装载引用类型值 |
| baload | 从数组中装载byte类型或boolean类型值 |
| caload | 从数组中装载char类型值 |
| saload | 从数组中装载short类型值 |

3、将栈中的值存入局部变量的指令

| 指令 | 描述 |
| --- | --- |
| istore | 将int类型值存入局部变量 |
| lstore | 将long类型值存入局部变量 |
| fstore | 将float类型值存入局部变量 |
| dstore | 将double类型值存入局部变量 |
| astore | 将引用类型或returnAddress类型值存入局部变量 |
| istore_0 | 将int类型值存入局部变量0 |
| istore_1 | 将int类型值存入局部变量1 |
| istore_2 | 将int类型值存入局部变量2 |
| istore_3 | 将int类型值存入局部变量3 |
| lstore_0 | 将long类型值存入局部变量0 |
| lstore_1 | 将long类型值存入局部变量1 |
| lstore_2 | 将long类型值存入局部变量2 |
| lstore_3 | 将long类型值存入局部变量3 |
| fstore_0 | 将float类型值存入局部变量0 |
| fstore_1 | 将float类型值存入局部变量1 |
| fstore_2 | 将float类型值存入局部变量2 |
| fstore_3 | 将float类型值存入局部变量3 |
| dstore_0 | 将double类型值存入局部变量0 |
| dstore_1 | 将double类型值存入局部变量1 |
| dstore_2 | 将double类型值存入局部变量2 |
| dstore_3 | 将double类型值存入局部变量3 |
| astore_0 | 将引用类型或returnAddress类型值存入局部变量0 |
| astore_1 | 将引用类型或returnAddress类型值存入局部变量1 |
| astore_2 | 将引用类型或returnAddress类型值存入局部变量2 |
| astore_3 | 将引用类型或returnAddress类型值存入局部变量3 |
| iastore | 将int类型值存入数组中 |
| lastore | 将long类型值存入数组中 |
| fastore | 将float类型值存入数组中 |
| dastore | 将double类型值存入数组中 |
| aastore | 将引用类型值存入数组中 |
| bastore | 将byte类型或者boolean类型值存入数组中 |
| castore | 将char类型值存入数组中 |
| sastore | 将short类型值存入数组中 |

4、通用(无类型）栈操作

| 指令 | 描述 |
| --- | --- |
| nop | 不做任何操作 |
| pop | 弹出栈顶端一个字长的内容 |
| pop2 | 弹出栈顶端两个字长的内容 |
| dup | 复制栈顶部一个字长内容 |
| dup_x1 | 复制栈顶部一个字长的内容，然后将复制内容及原来弹出的两个字长的内容压入栈。顺序是：第二个字长、第一个字长（原始）、第一个字长（复制） |
| dup_x2 | 复制栈顶部一个字长的内容，然后将复制内容及原来弹出的三个字长的内容压入栈。顺序是：第三个字长、第二个字长、第一个字长（原始）、第一个字长（复制） |
| dup2 | 复制栈顶部两个字长内容 |
| dup2_x1 | 复制栈顶部两个字长的内容，然后将复制内容及原来弹出的三个字长的内容压入栈。顺序是：第三个字长、第二个字长（原始）、第一个字长（原始）、第二个字长（复制）、第一个字长（复制） |
| dup2_x2 | 复制栈顶部两个字长的内容，然后将复制内容及原来弹出的四个字长的内容压入栈。顺序是：第四个字长、第三个字长、第二个字长（原始）、第一个字长（原始）、第二个字长（复制）、第一个字长（复制） |

5、类型转换

| 指令 | 描述 |
| --- | --- |
| i2l | 把int类型的数据转化为long类型 |
| i2f | 把int类型的数据转化为float类型 |
| i2d | 把int类型的数据转化为double类型 |
| l2i | 把long类型的数据转化为int类型 |
| l2f | 把long类型的数据转化为float类型 |
| l2d | 把long类型的数据转化为double类型 |
| f2i | 把float类型的数据转化为int类型 |
| f2l | 把float类型的数据转化为long类型 |
| f2d | 把float类型的数据转化为double类型 |
| d2i | 把double类型的数据转化为int类型 |
| d2l | 把double类型的数据转化为long类型 |
| d2f | 把double类型的数据转化为float类型 |
| i2b | 把int类型的数据转化为byte类型 |
| i2c | 把int类型的数据转化为char类型 |
| i2s | 把int类型的数据转化为short类型 |

6、整数运算

| 指令 | 描述 |
| --- | --- |
| iadd | 执行int类型的加法 |
| ladd | 执行long类型的加法 |
| isub | 执行int类型的减法 |
| lsub | 执行long类型的减法 |
| imul | 执行int类型的乘法 |
| lmul | 执行long类型的乘法 |
| idiv | 执行int类型的除法 |
| ldiv | 执行long类型的除法 |
| irem | 计算int类型除法的余数 |
| lrem | 计算long类型除法的余数 |
| ineg | 对一个int类型值进行取反操作 |
| lneg | 对一个long类型值进行取反操作 |
| iinc | 把一个常量值加到一个int类型的局部变量上 |

7、移位操作

| 指令 | 描述 |
| --- | --- |
| ishl | 执行int类型的向左移位操作 |
| lshl | 执行long类型的向左移位操作 |
| ishr | 执行int类型的向右移位操作 |
| lshr | 执行long类型的向右移位操作 |
| iushr | 执行int类型的向右逻辑移位操作 |
| lushr | 执行long类型的向右逻辑移位操作 |

8、逻辑运算：按位布尔运算

| 指令 | 描述 |
| --- | --- |
| iand | 对int类型值进行“逻辑与”操作 |
| land | 对long类型值进行“逻辑与”操作 |
| ior | 对int类型值进行“逻辑或”操作 |
| lor | 对long类型值进行“逻辑或”操作 |
| ixor | 对int类型值进行“逻辑异或”操作 |
| lxor | 对long类型值进行“逻辑异或”操作 |

9、浮点运算

| 指令 | 描述 |
| --- | --- |
| fadd | 执行float类型的加法 |
| dadd | 执行double类型的加法 |
| fsub | 执行float类型的减法 |
| dsub | 执行double类型的减法 |
| fmul | 执行float类型的乘法 |
| dmul | 执行double类型的乘法 |
| fdiv | 执行float类型的除法 |
| ddiv | 执行double类型的除法 |
| frem | 计算float类型除法的余数 |
| drem | 计算double类型除法的余数 |
| fneg | 将一个float类型的数值取反 |
| dneg | 将一个double类型的数值取反 |

10、对象和数组、对象操作指令

| 指令 | 描述 |
| --- | --- |
| new | 创建一个新对象 |
| checkcast | 确定对象为所给定的类型 |
| getfield | 从对象中获取字段 |
| putfield | 设置对象中字段的值 |
| getstatic | 从类中获取静态字段 |
| putstatic | 设置类中静态字段的值 |
| instanceof | 判断对象是否为给定的类型 |

11、数组操作指令

| 指令 | 描述 |
| --- | --- |
| newarray | 分配数据成员类型为基本数据类型的新数组 |
| anewarray | 分配数据成员类型为引用类型的新数组 |
| arraylength | 获取数组长度 |
| multianewarray | 分配新的多维数组 |

12、条件判断指令

| 指令 | 描述 |
| --- | --- |
| ifeq | 如果等于0，则跳转 |
| ifne | 如果不等于0，则跳转 |
| iflt | 如果小于0，则跳转 |
| ifge | 如果大于等于0，则跳转 |
| ifgt | 如果大于0，则跳转 |
| ifle | 如果小于等于0，则跳转 |
| if_icmpeq | 如果两个int值相等，则跳转 |
| if_icmpne | 如果两个int类型值不相等，则跳转 |
| if_icmplt | 如果一个int类型值小于另外一个int类型值，则跳转 |
| if_icmpge | 如果一个int类型值大于或者等于另外一个int类型值，则跳转 |
| if_icmpgt | 如果一个int类型值大于另外一个int类型值，则跳转 |
| if_icmple | 如果一个int类型值小于或者等于另外一个int类型值，则跳转 |
| ifnull | 如果等于null，则跳转 |
| ifnonnull | 如果不等于null，则跳转 |
| if_acmpeq | 如果两个对象引用相等，则跳转 |
| if_acmpne | 如果两个对象引用不相等，则跳转 |

13、比较指令

| 指令 | 描述 |
| --- | --- |
| lcmp | 比较两个long类型值，根据比较结果返回-1, 0, 或1 |
| fcmpl | 比较两个float类型值；如果一个值是NaN，则返回-1 |
| fcmpg | 比较两个float类型值；如果一个值是NaN，则返回1 |
| dcmpl |  |

14、无条件转移指令（查阅补充）

| 指令 | 描述 |
| --- | --- |
| goto | 无条件跳转，用于无条件地跳转到指定的指令位置。它后面跟着一个操作数，该操作数是指令在方法代码数组中的偏移量。 |
| goto_w | 无条件跳转（宽索引），与goto类似，但使用更宽的索引来指定跳转的目标地址，允许跳转到更远的位置。这在需要更大范围的跳转时使用。 |

15、表跳转指令：这两种指令优化了`switch`语句的执行效率，使得程序能够更高效地处理多个分支的选择

| 指令 | 描述 |
| --- | --- |
| tableswitch | 通过索引访问跳转表，并根据匹配的索引值执行相应的跳转操作。适用于连续的索引值范围。 |
| lookupswitch | 通过键值匹配访问跳转表，并根据匹配的键值执行相应的跳转操作。适用于非连续或稀疏的键值。 |

16、异常

| 指令 | 描述 |
| --- | --- |
| athrow | 抛出异常或错误 |
| jsr | 跳转到子例程，并将返回地址压入栈 |
| jsr_w | 跳转到子例程（宽索引），并将返回地址压入栈 |
| ret | 从子例程返回 |

注意：`jsr` 和 `jsr_w` 指令已经被标记为 deprecated，在现代Java版本中不推荐使用，因为它们支持的子例程（subroutine）机制已经被更简单的控制流结构所取代。`ret` 指令与 `jsr` 和 `jsr_w` 一起使用，用于从子例程返回，但它本身并不单独使用。

17、方法调用

| 指令 | 描述 |
| --- | --- |
| invokevirtual | 运行时按照对象的实际类来调用实例方法 |
| invokespecial | 根据编译时类型来调用实例方法，用于调用私有方法、构造方法和超类方法 |
| invokestatic | 调用类（静态）方法 |
| invokeinterface | 调用接口方法 |

18、方法返回

| 指令 | 描述 |
| --- | --- |
| ireturn | 从方法中返回int类型的数据 |
| lreturn | 从方法中返回long类型的数据 |
| freturn | 从方法中返回float类型的数据 |
| dreturn | 从方法中返回double类型的数据 |
| areturn | 从方法中返回引用类型的数据 |
| return | 从方法中返回，返回值为void |

18、线程同步

`monitorenter` 和 `monitorexit` 操作与Java中的`synchronized`关键字相关联，用来实现对共享资源的安全访问。

| 指令 | 描述 |
| --- | --- |
| monitorenter | 进入并获取对象监视器（锁对象） |
| monitorexit | 释放并退出对象监视器（解锁对象） |

## 持续更新：JDK17后字节码指令变化：新增与改进的指令（JDK 8及之后）

| 指令 | 描述 |
| --- | --- |
| [invokedynamic](https://docs.oracle.com/javase/specs/jvms/se8/html/jvms-6.html#jvms-6.5.invokedynamic) | 动态分派调用，用于支持动态类型语言和lambda表达式的实现；主要用于Lambda表达式的实现以及方法引用的支持 |

### 类型注解和重复注解支持

JDK 8增加了对类型注解和重复注解的支持，但这并不直接对应新的字节码指令，而是增强了现有指令处理注解的能力。

### 方法参数反射信息

JDK 8允许在运行时通过反射API访问方法参数名称，这同样不涉及新的字节码指令，但改变了类文件格式以存储额外的调试信息。

### 其他改进

- **Method Handles 和 Method Types**：虽然这些特性是在JDK 7中引入的，但在JDK 8中得到了进一步的利用和支持，特别是为了实现`invokedynamic`指令。
- **String Concatenation Optimization**：JDK 9开始，字符串拼接操作在编译时被优化为使用`invokedynamic`，从而提高了性能。

自JDK 8以来，大部分的变化主要集中在语言特性、库增强和JVM内部优化上，并没有大的新字节码指令出现。最显著的变化是`invokedynamic`指令的引入及其对Lambda表达式的支持。

# 🤗总结归纳

字节码还不是最终解释执行的机器码，我是将字节码到机器码的过程看作是DNA转录的过程类似，都是一个翻译的过程。字节码是学好JVM的基础基石，学习绝非一朝一夕之功，需要持之以恒，我坚信哪怕没有大厂的熏陶，自我坚持自我学习，一样能够有过硬的实力，加油💪，学习字节码基本指令不是为了背诵，而是为了方便自己快速理解记忆字节码描述的指令流程。

# 参考文章

点击下载图灵架构师CTA课程包含的原资料文件：[点击此处下载](https://qnm.hunliji.com/o_1ihhp9q9dj6enj4hdq1ihn188c9.pdf)

致谢：

<aside>
💡 有关JVM指令的系列问题，欢迎您在底部评论区留言，一起交流~

</aside>