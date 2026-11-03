#import <Foundation/Foundation.h>

@interface TaskQueue : NSObject
@property(nonatomic, strong) NSMutableArray<NSMutableDictionary *> *tasks;
- (BOOL)addTitle:(NSString *)title;
- (BOOL)completeTaskWithId:(NSInteger)taskId;
- (NSArray<NSString *> *)pendingTitles;
@end

@implementation TaskQueue
- (instancetype)init {
    self = [super init];
    if (self) _tasks = [NSMutableArray array];
    return self;
}

- (BOOL)addTitle:(NSString *)title {
    NSString *cleanTitle = [title stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
    if (cleanTitle.length == 0) return NO;
    NSInteger nextId = self.tasks.count + 1;
    [self.tasks addObject:[@{@"id": @(nextId), @"title": cleanTitle, @"done": @NO} mutableCopy]];
    return YES;
}

- (BOOL)completeTaskWithId:(NSInteger)taskId {
    for (NSMutableDictionary *task in self.tasks) {
        if ([task[@"id"] integerValue] == taskId) {
            task[@"done"] = @YES;
            return YES;
        }
    }
    return NO;
}

- (NSArray<NSString *> *)pendingTitles {
    NSMutableArray *titles = [NSMutableArray array];
    for (NSDictionary *task in self.tasks) {
        if (![task[@"done"] boolValue]) [titles addObject:task[@"title"]];
    }
    return titles;
}
@end

int main(void) {
    @autoreleasepool {
        TaskQueue *queue = [TaskQueue new];
        [queue addTitle:@"Review changes"];
        [queue addTitle:@"Publish package"];
        if (![queue completeTaskWithId:1]) return 1;
        [queue addTitle:@"Write documentation"];
        NSLog(@"Pending tasks: %@", [queue pendingTitles]);
    }
    return 0;
}
